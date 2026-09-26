/**
 * função de compartilhamento
 *
 * fiz um pequeno fluxo de compartilhamento para os links da descrição.
 * ao clicar, redireciona para a plataforma, mas com o link e a descrição
 * do projeto. coloquei uns comentários aqui em baixo para entender como
 * funciona.
 *
 * e outra coisa, estou fazendo isso porque não quero criar 450
 * redes sociais diferentes para um projeto que será apenas uma ferramenta,
 * e não um produto que será monetário, a não ser que eu cobre planos ou coloque
 * propagandas, mas sinceramente, eu não me importo muito em ganhar um dinheiro extra.
 */

// link do projeto
export const PROJECT_URL = "http://anota-ai.otsuki.dev";

// texto para compartilhar
export const SHARE_TEXT =
  "Anota Aí! 📝 Transforme as reuniões de desenvolvimento em resumos estruturados e tarefas no GitHub.";

const encode = (value: string) => encodeURIComponent(value);

// link do projeto para compartilhar
export const projectUrl = () => PROJECT_URL;

// compartilhar no twitter
export const xShareUrl = () =>
  `https://twitter.com/intent/tweet?text=${encode(SHARE_TEXT)}&url=${encode(
    PROJECT_URL,
  )}`;

// e no linkedin
export const linkedinShareUrl = () =>
  `https://www.linkedin.com/sharing/share-offsite/?url=${encode(PROJECT_URL)}`;

// e no zapzap
export const whatsappShareUrl = () =>
  `https://api.whatsapp.com/send?text=${encode(`${SHARE_TEXT}\n${PROJECT_URL}`)}`;

// e no telegram
export const telegramShareUrl = () =>
  `https://t.me/share/url?url=${encode(PROJECT_URL)}&text=${encode(SHARE_TEXT)}`;

// e no livro da face
export const facebookShareUrl = () =>
  `https://www.facebook.com/sharer/sharer.php?u=${encode(PROJECT_URL)}`;
