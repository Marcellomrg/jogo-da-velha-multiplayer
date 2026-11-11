BEGIN;
CREATE TABLE public.jogadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject text NOT NULL UNIQUE,
  apelido varchar(30) NOT NULL UNIQUE CHECK (char_length(btrim(apelido)) BETWEEN 3 AND 30),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.partidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_sala varchar(6) NOT NULL UNIQUE CHECK (codigo_sala ~ '^[A-F0-9]{6}$'),
  jogador_x_id uuid NOT NULL REFERENCES public.jogadores,
  jogador_o_id uuid REFERENCES public.jogadores,
  apelido_x varchar(30) NOT NULL,
  apelido_o varchar(30),
  tabuleiro jsonb NOT NULL DEFAULT '[null,null,null,null,null,null,null,null,null]',
  proximo_simbolo char(1) NOT NULL DEFAULT 'X' CHECK (proximo_simbolo IN ('X','O')),
  status text NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando','em_andamento','finalizada','cancelada')),
  vencedor_id uuid REFERENCES public.jogadores,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  CHECK (jogador_o_id IS DISTINCT FROM jogador_x_id),
  CHECK (jsonb_typeof(tabuleiro) = 'array' AND jsonb_array_length(tabuleiro) = 9),
  CHECK (status NOT IN ('em_andamento','finalizada') OR jogador_o_id IS NOT NULL),
  CHECK ((jogador_o_id IS NULL) = (apelido_o IS NULL)),
  CHECK ((status = 'finalizada') = (finalizado_em IS NOT NULL)),
  CHECK (vencedor_id IS NULL OR (status = 'finalizada' AND (vencedor_id = jogador_x_id OR vencedor_id IS NOT DISTINCT FROM jogador_o_id)))
);
CREATE INDEX partidas_x_idx ON public.partidas (jogador_x_id);
CREATE INDEX partidas_o_idx ON public.partidas (jogador_o_id);
CREATE TABLE public.jogadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id uuid NOT NULL REFERENCES public.partidas,
  jogador_id uuid NOT NULL REFERENCES public.jogadores,
  posicao smallint NOT NULL CHECK (posicao BETWEEN 0 AND 8),
  simbolo char(1) NOT NULL CHECK (simbolo IN ('X','O')),
  numero_turno smallint NOT NULL CHECK (numero_turno BETWEEN 1 AND 9),
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partida_id,posicao),
  UNIQUE (partida_id,numero_turno)
);
CREATE VIEW public.placar AS
WITH resultados AS (
  SELECT participante.id, p.vencedor_id
  FROM public.partidas p
  CROSS JOIN LATERAL (VALUES (p.jogador_x_id),(p.jogador_o_id)) participante(id)
  WHERE p.status = 'finalizada'
), totais AS (
  SELECT id, count(*) FILTER (WHERE vencedor_id = id)::int AS vitorias,
    count(*) FILTER (WHERE vencedor_id IS NULL)::int AS empates,
    count(*) FILTER (WHERE vencedor_id <> id)::int AS derrotas
  FROM resultados GROUP BY id
)
SELECT j.id AS jogador_id, j.apelido, t.vitorias, t.empates, t.derrotas,
  (t.vitorias * 3 + t.empates) AS pontos
FROM totais t JOIN public.jogadores j ON j.id = t.id;

CREATE FUNCTION public.registrar_perfil(sessao json, nome text)
RETURNS SETOF public.jogadores LANGUAGE plpgsql VOLATILE SET search_path = public, pg_temp AS $$
DECLARE sujeito text := sessao->>'x-hasura-user-id';
BEGIN
  IF coalesce(sujeito,'') = '' THEN RAISE EXCEPTION 'Sessão inválida'; END IF;
  IF nome IS NULL OR char_length(btrim(nome)) NOT BETWEEN 3 AND 30 THEN
    RAISE EXCEPTION 'Use um apelido de 3 a 30 caracteres';
  END IF;
  RETURN QUERY INSERT INTO public.jogadores(auth_subject,apelido) VALUES(sujeito,btrim(nome))
    ON CONFLICT (auth_subject) DO UPDATE SET apelido = excluded.apelido RETURNING *;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Apelido indisponível';
END $$;

CREATE FUNCTION public.jogador_da_sessao(sessao json)
RETURNS uuid LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE jogador uuid;
BEGIN
  SELECT id INTO jogador FROM public.jogadores WHERE auth_subject = sessao->>'x-hasura-user-id';
  IF jogador IS NULL THEN RAISE EXCEPTION 'Cadastre seu perfil'; END IF;
  RETURN jogador;
END $$;

CREATE FUNCTION public.criar_partida(sessao json)
RETURNS SETOF public.partidas LANGUAGE plpgsql VOLATILE SET search_path = public, pg_temp AS $$
DECLARE jogador uuid := public.jogador_da_sessao(sessao);
BEGIN
  FOR tentativa IN 1..20 LOOP
    RETURN QUERY INSERT INTO public.partidas(codigo_sala,jogador_x_id,apelido_x)
      VALUES (upper(substr(replace(gen_random_uuid()::text,'-',''),1,6)),jogador,(SELECT apelido FROM public.jogadores WHERE id=jogador))
      ON CONFLICT (codigo_sala) DO NOTHING RETURNING *;
    IF FOUND THEN RETURN; END IF;
  END LOOP;
  RAISE EXCEPTION 'Não foi possível gerar um código';
END $$;

CREATE FUNCTION public.entrar_partida(sessao json, codigo text)
RETURNS SETOF public.partidas LANGUAGE plpgsql VOLATILE SET search_path = public, pg_temp AS $$
DECLARE jogador uuid := public.jogador_da_sessao(sessao);
DECLARE partida public.partidas%ROWTYPE;
BEGIN
  SELECT * INTO partida FROM public.partidas WHERE codigo_sala = upper(btrim(codigo)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sala inválida'; END IF;
  IF jogador = partida.jogador_x_id OR jogador = partida.jogador_o_id THEN
    RETURN NEXT partida;
    RETURN;
  END IF;
  IF partida.status <> 'aguardando' OR partida.jogador_o_id IS NOT NULL THEN
    RAISE EXCEPTION 'Sala cheia ou indisponível';
  END IF;
  RETURN QUERY UPDATE public.partidas SET jogador_o_id = jogador, apelido_o = (SELECT apelido FROM public.jogadores WHERE id=jogador),
    status = 'em_andamento',
    atualizado_em = clock_timestamp() WHERE id = partida.id RETURNING *;
END $$;

CREATE FUNCTION public.realizar_jogada(sessao json, sala uuid, casa integer)
RETURNS SETOF public.partidas LANGUAGE plpgsql VOLATILE SET search_path = public, pg_temp AS $$
DECLARE jogador uuid := public.jogador_da_sessao(sessao);
DECLARE partida public.partidas%ROWTYPE;
DECLARE marca char(1);
DECLARE estado jsonb;
DECLARE linha int[];
DECLARE turno int;
DECLARE venceu boolean := false;
DECLARE terminou boolean;
BEGIN
  SELECT * INTO partida FROM public.partidas WHERE id = sala FOR UPDATE;
  IF NOT FOUND OR (jogador IS DISTINCT FROM partida.jogador_x_id AND jogador IS DISTINCT FROM partida.jogador_o_id) THEN
    RAISE EXCEPTION 'Partida indisponível';
  END IF;
  IF partida.status <> 'em_andamento' THEN RAISE EXCEPTION 'Partida fora de andamento'; END IF;
  marca := CASE WHEN jogador = partida.jogador_x_id THEN 'X' ELSE 'O' END;
  IF marca <> partida.proximo_simbolo THEN RAISE EXCEPTION 'Aguarde sua vez'; END IF;
  IF casa IS NULL OR casa NOT BETWEEN 0 AND 8 THEN RAISE EXCEPTION 'Casa inválida'; END IF;
  IF partida.tabuleiro->>casa IS NOT NULL THEN RAISE EXCEPTION 'Casa ocupada'; END IF;
  estado := jsonb_set(partida.tabuleiro, ARRAY[casa::text], to_jsonb(marca::text));
  SELECT count(*) + 1 INTO turno FROM public.jogadas WHERE partida_id = sala;
  INSERT INTO public.jogadas(partida_id,jogador_id,posicao,simbolo,numero_turno)
    VALUES(sala,jogador,casa,marca,turno);
  FOREACH linha SLICE 1 IN ARRAY ARRAY[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]] LOOP
    IF estado->>linha[1] = marca AND estado->>linha[2] = marca AND estado->>linha[3] = marca THEN
      venceu := true;
      EXIT;
    END IF;
  END LOOP;
  terminou := venceu OR turno = 9;
  RETURN QUERY UPDATE public.partidas SET tabuleiro = estado, atualizado_em = clock_timestamp(),
    proximo_simbolo = CASE WHEN terminou THEN marca WHEN marca = 'X' THEN 'O' ELSE 'X' END,
    status = CASE WHEN terminou THEN 'finalizada' ELSE 'em_andamento' END,
    vencedor_id = CASE WHEN venceu THEN jogador END,
    finalizado_em = CASE WHEN terminou THEN now() END
    WHERE id = sala RETURNING *;
END $$;
COMMIT;
