# Machamba Digital a funcionar a sério

Sair dos dados de exemplo e passar tudo a funcionar com contas reais, anúncios reais e fotografias reais. O aspecto dos ecrãs mantém-se igual: cores, letras e disposição não mudam.

Como é muito trabalho, proponho entregar por fases, para poderes ir vendo e testando.

## Fase 1 — Contas e anúncios reais
- Ligar a base de dados e o sistema de contas do Lovable Cloud.
- Registo e entrada com email ou telemóvel (+258) e palavra-passe, com sessão que se mantém.
- Perfil real de cada pessoa: nome, telefone, email, tipo (agricultor, comprador, agrónomo, administrador), província, distrito, fotografia e estado de verificação.
- Botão de sair da conta e proteção: só quem tem conta pode publicar, enviar mensagens, avaliar, denunciar ou usar o diagnóstico.
- Anúncios reais: publicar, ver, pesquisar e filtrar por província, distrito e categoria. Fim dos anúncios de exemplo.
- Fotografias dos anúncios enviadas de verdade, reduzidas no telemóvel antes de enviar para funcionar com internet fraca.
- Favoritos guardados na conta.

## Fase 2 — Conversas, diagnóstico e avaliações
- Conversas entre comprador e vendedor ligadas ao anúncio, atualizadas ao vivo, sem recarregar a página, e sem conversas repetidas para o mesmo par.
- Diagnóstico por fotografia guardado no histórico do perfil, com grau de confiança. Abaixo de 70% fica marcado como confiança baixa e avisa que pode seguir para revisão de um agrónomo.
- Depois do diagnóstico, sugerir apenas anúncios que existam mesmo no mercado (por exemplo fertilizantes). Nunca inventar produtos.
- Avaliar vendedor de 1 a 5 estrelas com comentário, disponível só depois de ter havido conversa entre os dois.
- Denunciar anúncios, com o motivo guardado para o administrador tratar.
- Avisos reais: mensagem nova, anúncio aprovado, diagnóstico pronto e avaliação recebida, com contador de não lidos a atualizar ao vivo.

## Fase 3 — Área de administração
- Zona reservada só a administradores.
- Ver, ativar e desativar utilizadores.
- Aprovar, rejeitar ou remover anúncios pendentes.
- Gerir categorias: criar, editar, ativar, desativar e reordenar.
- Ver e resolver denúncias.
- Estatísticas em gráficos: utilizadores, anúncios ativos, vendidos, análises feitas e denúncias.
- Artigos da secção Aprender geridos aqui, em vez de textos fixos.

## Nota sobre o diagnóstico
O diagnóstico continua a usar a inteligência artificial já ligada ao projeto, que analisa a fotografia e devolve diagnóstico, descrição, recomendação, gravidade e confiança. Se preferires um serviço especializado em plantas, como o Plant.id, é possível, mas é pago e precisa de uma chave tua; diz-me e ligo-o.

O resultado é sempre apresentado como orientação, nunca como certeza.

## Detalhes técnicos
- Tabelas: categorias, produtos, produto_fotos, favoritos, conversas, mensagens, avaliacoes, analises_cultura, notificacoes, denuncias, artigos, profiles, e uma tabela separada de papéis para o acesso de administrador (por segurança, o papel nunca fica no perfil).
- Segurança ao nível da linha em todas as tabelas: leitura pública onde faz sentido (anúncios ativos, categorias, artigos publicados), escrita apenas pelo dono.
- Fotografias em Supabase Storage (buckets de produtos e de diagnósticos), comprimidas no browser com browser-image-compression.
- Chat e notificações por Supabase Realtime.
- A análise por IA passa a correr numa função de servidor do projeto (TanStack server function), que guarda o registo em analises_cultura e procura produtos relacionados reais.
- Gráficos do painel com Recharts.

## Verificação
- Compilação sem erros e teste dos fluxos principais no telemóvel e no computador em cada fase.
