/* AtendeBra · protótipo navegável
   Cada tela é uma imagem; as áreas clicáveis ficam em coordenadas da imagem (largura 1600)
   e são convertidas em % para escalar com a janela. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var W0 = 1600;

  /* ------------------------------------------------------------------ estado */
  var DEF = { id: 'pix-subhome', m: 'roubo', e: 'corr', av: 'a', v: '1', bl: '0', ms: '' };
  var st = Object.assign({}, DEF);
  var visited = {};
  var pop = null;           // popover aberto: {k, at}
  var timer = null, toastT = null, hsTimer = null;
  var depth = 0;            // quantas telas já foram empilhadas no histórico do navegador
  var missionDone = false;
  var TEST = /[?&]teste=1\b/.test(location.search);  // modo teste de usabilidade (teste.js)
  var gen = 0;              // muda a cada tarefa do modo teste; entradas antigas do histórico são ignoradas
  var LST = {};
  function emit(ev, data) { (LST[ev] || []).forEach(function (f) { try { f(data); } catch (e) { if (window.console) console.error(e); } }); }

  var FAM = { roubo: 'Roubo', furto: 'Furto', fraude: 'Fraude', perda: 'Perda' };
  var NOFAM = { enc: 'Encerramento de conta', fal: 'Falecimento', des: 'Desinteresse', out: 'Outros' };
  function isFam(m) { return !!FAM[m]; }

  /* --------------------------------------------------------------- utilidades */
  function rows(y0, step, n, x, w, h, popAt) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var cy = y0 + step * i;
      out.push({ r: [x, cy - h / 2, w, h], tip: 'Abrir o menu da transação', pop: { k: 'row', at: [1405, cy + 26, 'r'] } });
    }
    return out;
  }
  var VOLTAR = { r: [150, 222, 130, 56], tip: 'Voltar', act: 'back' };
  function soon(msg) { return function () { toast(msg); }; }
  var MSG_CONTESTAR = 'Aqui começa a abertura da contestação. Esse trecho ainda está em definição com o negócio e fica fora do protótipo.';

  /* ------------------------------------------------------------------- telas */
  var SCREENS = {
    'pix-subhome': {
      grp: 'pix', nav: 'Visão geral do Pix', t: 'Visão geral do Pix',
      d: 'Chaves cadastradas, limites e extrato na mesma página. Use os atalhos, os filtros ou o menu de uma transação.',
      img: function (s) { return s.v === '2' ? 'pix-subhome-v02' : 'pix-subhome'; },
      tools: [{ k: 'v', label: 'Atalhos', opts: [['1', 'Abaixo das chaves'], ['2', 'No topo']] }],
      hs: function (s) {
        var v2 = s.v === '2';
        var a = [VOLTAR];
        if (!v2) {
          a.push({ r: [175, 585, 190, 110], tip: 'Contestação: ir para o extrato', act: 'toExtrato', y: 1060 });
          a.push({ r: [385, 585, 195, 110], tip: 'Contatos cadastrados', to: 'pix-contatos' });
          a.push({ r: [595, 585, 190, 110], tip: 'Extrato Pix', to: 'pix-extrato' });
          a.push({ r: [195, 1375, 300, 45], tip: 'Tipo de transação', pop: { k: 'tipo', at: [195, 1424] } });
          a.push({ r: [500, 1375, 330, 45], tip: 'Buscar por data', pop: { k: 'cal', at: [500, 1424] } });
          a.push({ r: [195, 1452, 225, 42], tip: 'Filtrar por valores', pop: { k: 'valor', at: [195, 1498] } });
          a.push({ r: [1285, 1380, 130, 30], tip: 'Limpar filtros', toast: 'Filtros limpos.' });
          a = a.concat(rows(1664, 98, 6, 180, 1260, 90));
          a.push({ r: [755, 2195, 110, 36], tip: 'Ver mais', to: 'pix-extrato' });
        } else {
          a.push({ r: [156, 376, 190, 112], tip: 'Contestação: ir para o extrato', act: 'toExtrato', y: 1000 });
          a.push({ r: [364, 376, 192, 112], tip: 'Contatos cadastrados', to: 'pix-contatos' });
          a.push({ r: [574, 376, 192, 112], tip: 'Extrato Pix', to: 'pix-extrato' });
          a.push({ r: [545, 1240, 260, 46], tip: 'Tipo de transação', pop: { k: 'tipo', at: [545, 1290] } });
          a.push({ r: [875, 1240, 380, 46], tip: 'Buscar por data', pop: { k: 'cal', at: [875, 1290] } });
          a.push({ r: [195, 1318, 225, 42], tip: 'Filtrar por valores', pop: { k: 'valor', at: [195, 1364] } });
          a.push({ r: [1285, 1250, 130, 30], tip: 'Limpar filtros', toast: 'Filtros limpos.' });
          a = a.concat(rows(1526, 98, 6, 180, 1260, 90));
        }
        return a;
      }
    },
    'pix-extrato': {
      grp: 'pix', nav: 'Extrato Pix', t: 'Extrato Pix',
      d: 'Meses em abas, busca por nome ou valor e uma lista com data, descrição, valor e sentido da transação. Clique em uma linha.',
      img: function () { return 'pix-extrato'; },
      hs: function () {
        var a = [VOLTAR];
        a.push({ r: [195, 697, 300, 48], tip: 'Tipo de transação', pop: { k: 'tipo', at: [195, 748] } });
        a.push({ r: [500, 697, 330, 48], tip: 'Buscar por data', pop: { k: 'cal', at: [500, 748] } });
        a.push({ r: [195, 778, 225, 42], tip: 'Filtrar por valores', pop: { k: 'valor', at: [195, 826] } });
        a.push({ r: [1285, 705, 130, 30], tip: 'Limpar filtros', toast: 'Filtros limpos.' });
        return a.concat(rows(986, 98, 16, 180, 1260, 90));
      }
    },
    'pix-detalhe': {
      grp: 'pix', nav: 'Detalhe da transação', t: 'Detalhe da transação',
      d: 'Identificação, pagador, favorecido e dados da transação em blocos separados. Quando existe bloqueio cautelar ou MED, eles entram como blocos próprios.',
      img: function (s) { return s.bl === '1' ? 'ct-detalhe-blocos' : 'ct-detalhe'; },
      tools: [{ k: 'bl', label: 'Blocos de apoio', opts: [['0', 'Ocultos'], ['1', 'Bloqueio e MED']] }],
      hs: function (s) {
        var dy = s.bl === '1' ? 384 : 0;
        return [VOLTAR, { r: [157, 1658 + dy, 218, 59], tip: 'Contestar este Pix', toast: MSG_CONTESTAR }];
      }
    },
    'pix-pagamento': {
      grp: 'pix', nav: 'Dados do pagamento', t: 'Dados do pagamento',
      d: 'Resumo do Pix pago por QR code, com quem pagou e quem recebeu, e o botão Contestar este Pix.',
      img: function () { return 'pix-pagamento'; },
      hs: function () {
        return [VOLTAR, { r: [157, 778, 218, 59], tip: 'Contestar este Pix', toast: MSG_CONTESTAR }];
      }
    },
    'pix-contatos': {
      grp: 'pix', nav: 'Contatos cadastrados', t: 'Contatos cadastrados',
      d: 'Lista de contatos Pix com tipo de chave, instituição, validade e ação de exclusão, paginada.',
      img: function () { return 'pix-contatos'; },
      hs: function () {
        var a = [VOLTAR], i;
        for (i = 0; i < 8; i++) a.push({ r: [1232, 566 + i * 78 - 4, 56, 52], tip: 'Excluir contato', toast: 'Excluir contato: ação ilustrativa, não faz parte do protótipo.' });
        for (i = 0; i < 8; i++) a.push({ r: [978 + i * 55, 1256, 44, 36], tip: 'Página ' + (i + 2), toast: 'Paginação ilustrativa: o protótipo mostra só a primeira página.' });
        return a;
      }
    },

    'cx-cartao': {
      grp: 'card', nav: 'Cartão de débito', t: 'Cartão de débito',
      d: 'Dados do cartão e três ações: cancelamento e reemissão, transações bloqueadas e outros. O fluxo do protótipo começa em Cancelamento e reemissão.',
      img: function () { return 'cx-cartao'; },
      hs: function () {
        return [VOLTAR,
          { r: [155, 380, 500, 48], tip: 'Selecionar titular', toast: 'A troca de titular fica fora do protótipo.' },
          { r: [175, 724, 192, 112], tip: 'Cancelamento e reemissão', to: 'cx-motivo', set: { m: 'roubo' } },
          { r: [400, 724, 192, 112], tip: 'Transações bloqueadas', toast: 'Transações bloqueadas: fora do escopo desta entrega.' },
          { r: [622, 724, 192, 112], tip: 'Outros', toast: 'Outras ações do cartão: fora do escopo desta entrega.' }];
      }
    },
    'cx-motivo': {
      grp: 'card', nav: 'Motivo do cancelamento', t: 'Motivo do cancelamento',
      d: 'Antes de escolher o motivo nada mais aparece na tela, só o campo e o botão Confirmar. Abra o campo para escolher.',
      img: function () { return 'cx-motivo'; },
      hs: function () {
        return [VOLTAR,
          { r: [155, 590, 1305, 62], tip: 'Selecionar o motivo', to: 'cx-lista' },
          { r: [157, 676, 147, 58], tip: 'Confirmar', act: 'needMotive' },
          { r: [335, 690, 70, 30], tip: 'Voltar', act: 'back' }];
      }
    },
    'cx-lista': {
      grp: 'card', nav: 'Lista de motivos', t: 'Lista de motivos',
      d: 'Furto, roubo, fraude, perda, não recebido, danificado, encerramento de conta, falecimento, desinteresse e outros. Cada motivo leva a um caminho.',
      img: function () { return 'cx-motivo-aberto'; },
      hs: function () {
        var ys = [686, 752, 816, 882, 946, 1012, 1076, 1142, 1208, 1272];
        var L = [['furto', 'Furto'], ['roubo', 'Roubo'], ['fraude', 'Fraude'], ['perda', 'Perda'], ['nr', 'Não recebido'], ['dan', 'Danificado'],
                 ['enc', 'Encerramento de conta'], ['fal', 'Falecimento'], ['des', 'Desinteresse'], ['out', 'Outros']];
        var a = [VOLTAR, { r: [155, 590, 1305, 62], tip: 'Fechar a lista', act: 'back' }];
        L.forEach(function (o, i) {
          var h = { r: [155, ys[i] - 32, 1305, 64], tip: o[1] };
          if (o[0] === 'nr' || o[0] === 'dan') h.toast = o[1] + ': a regra desse motivo ainda está em definição com o negócio e não está no protótipo.';
          else if (isFam(o[0])) { h.to = 'cx-entrega'; h.set = { m: o[0] }; }
          else { h.to = 'cx-xmotivo'; h.set = { m: o[0] }; }
          a.push(h);
        });
        return a;
      }
    },
    'cx-entrega': {
      grp: 'card', nav: 'Reemissão e entrega', t: 'Reemissão e entrega',
      d: 'Roubo, furto, fraude e perda trazem o aviso da biometria, o lembrete do prazo e do custo do novo cartão e o endereço de correspondência.',
      img: function (s) { return 'cx-' + (isFam(s.m) ? s.m : 'roubo') + (s.e === 'ag' ? '-agencia' : '-entrega'); },
      tools: [
        { k: 'e', label: 'Entrega', opts: [['corr', 'Correspondência'], ['ag', 'Agência']] },
        { k: 'av', label: 'Aviso do endereço', opts: [['a', 'Versão A'], ['b', 'Versão B']], when: function (s) { return s.e === 'ag'; } }
      ],
      hs: function (s) {
        var ag = s.e === 'ag';
        var a = [VOLTAR, { r: [155, 595, 1305, 55], tip: 'Trocar o motivo', to: 'cx-lista' }];
        if (!ag) {
          a.push({ r: [185, 1062, 155, 32], tip: 'Alterar endereço', to: 'cx-endereco' });
          a.push({ r: [157, 1144, 147, 58], tip: 'Confirmar', to: 'cx-confirmar' });
          a.push({ r: [338, 1158, 70, 30], tip: 'Voltar', act: 'back' });
        } else {
          a.push({ r: [470, 944, 130, 46], tip: 'Por que não posso alterar?', pop: { k: 'aviso', at: [572, 992, 'tip'] } });
          a.push({ r: [157, 1064, 147, 58], tip: 'Confirmar', to: 'cx-confirmar' });
          a.push({ r: [338, 1078, 70, 30], tip: 'Voltar', act: 'back' });
        }
        return a;
      }
    },
    'cx-endereco': {
      grp: 'card', nav: 'Alterar endereço', t: 'Alterar endereço',
      d: 'Formulário com CEP, estado, cidade, bairro, endereço, número e complemento, só para o cartão enviado por correspondência.',
      img: function () { return 'cx-endereco'; },
      hs: function () {
        return [VOLTAR,
          { r: [157, 688, 113, 59], tip: 'Salvar', act: 'back', toast: 'Endereço atualizado (demonstração).' },
          { r: [300, 700, 95, 34], tip: 'Cancelar', act: 'back' }];
      }
    },
    'cx-xmotivo': {
      grp: 'card', nav: 'Motivo sem reemissão', t: function (s) { return NOFAM[s.m] || 'Motivo selecionado'; },
      d: function (s) {
        return { enc: 'Sem reemissão: não há endereço nem prazo de entrega para preencher.',
                 fal: 'Orientação para o cliente ir à agência detentora da conta.',
                 des: 'A tela lembra o custo de R$ 8,10 da 2ª via e onde solicitar.',
                 out: 'Campo livre para descrever o motivo, com o mesmo aviso sobre a 2ª via.' }[s.m] || '';
      },
      img: function (s) { return 'cx-' + (NOFAM[s.m] ? s.m : 'enc') + '-motivo'; },
      hs: function (s) {
        var y = { enc: 676, fal: 776, des: 776, out: 866 }[s.m] || 676;
        return [VOLTAR, { r: [155, 595, 1305, 55], tip: 'Trocar o motivo', to: 'cx-lista' },
          { r: [157, y, 147, 58], tip: 'Confirmar', to: 'cx-confirmar' },
          { r: [338, y + 14, 70, 30], tip: 'Voltar', act: 'back' }];
      }
    },
    'cx-confirmar': {
      grp: 'card', nav: 'Confirmação', t: 'Confirmação do cancelamento',
      d: function (s) {
        return isFam(s.m) ? 'O modal confirma que o cartão atual será cancelado e que o cliente receberá um plástico novo.'
          : s.m === 'enc' ? 'O modal avisa que apenas o cartão será cancelado e que a conta do cliente continua ativa.'
          : s.m === 'fal' ? 'O modal informa que o cliente não receberá um plástico novo.'
          : 'O modal confirma o cancelamento sem novo plástico.';
      },
      img: function (s) { return 'cx-' + s.m + '-confirmar'; },
      hs: function () {
        return [{ r: [606, 610, 173, 60], tip: 'Sim, cancelar', to: 'cx-processando' },
          { r: [800, 622, 95, 38], tip: 'Fechar', act: 'back' },
          { r: [958, 338, 48, 48], tip: 'Fechar', act: 'back' }];
      }
    },
    'cx-processando': {
      grp: 'card', nav: 'Processando', t: 'Processando',
      d: 'Estado de espera enquanto o cancelamento é feito. Avança sozinho em alguns segundos, ou clique para pular.',
      img: function () { return 'cx-processando'; },
      hs: function () { return [{ r: [0, 240, 1500, 800], tip: 'Pular a espera', to: 'cx-resultado' }]; },
      auto: { to: 'cx-resultado', ms: 2200 }
    },
    'cx-resultado': {
      grp: 'card', nav: 'Resultado', t: 'Resultado',
      d: function (s) {
        return isFam(s.m) ? 'Aviso de sucesso, cartão com status Cancelado e a informação de que um novo cartão já foi solicitado.'
          : 'Cartão cancelado pelo motivo ' + (s.m === 'enc' ? 'encerramento de conta' : s.m === 'fal' ? 'falecimento' : s.m === 'des' ? 'desinteresse' : 'outros') + ', sem nova via.';
      },
      img: function (s) { return isFam(s.m) ? 'cx-roubo-resultado' : 'cx-' + s.m + '-resultado'; },
      end: true,
      hs: function () { return [{ r: [150, 222, 130, 56], tip: 'Voltar ao cartão', to: 'cx-cartao' }]; }
    }
  };

  /* ---------------------------------------------------------------- popovers */
  var POPS = {
    row: { img: 'pix-row-menu', s: .55, hs: [
      { r: [0, 0, 504, 104], tip: 'Ver detalhes da transação', to: 'pix-detalhe', set: { bl: '0' } },
      { r: [0, 104, 504, 104], tip: 'Contestar', to: 'pix-pagamento' },
      { r: [0, 208, 504, 104], tip: 'Outro', toast: 'Outras ações da transação: fora do escopo desta entrega.', close: 1 }] },
    tipo: { img: 'pix-filter-tipo', s: .62, hs: [
      { r: [0, 0, 412, 104], tip: 'Todas', toast: 'Tipo de transação: Todas.', close: 1 },
      { r: [0, 104, 412, 104], tip: 'Enviadas', toast: 'Tipo de transação: Enviadas.', close: 1 },
      { r: [0, 208, 412, 104], tip: 'Recebidas', toast: 'Tipo de transação: Recebidas.', close: 1 }] },
    valor: { img: 'pix-filter-valor', s: .6, hs: [
      { r: [32, 208, 170, 62], tip: 'Até R$ 50', toast: 'Faixa de valor: até R$ 50.' },
      { r: [234, 208, 180, 62], tip: 'R$ 50 a 500', toast: 'Faixa de valor: R$ 50 a 500.' },
      { r: [446, 208, 264, 62], tip: 'Acima de R$ 500', toast: 'Faixa de valor: acima de R$ 500.' },
      { r: [32, 484, 302, 64], tip: 'Filtrar', toast: 'Filtro por valor aplicado.', close: 1 },
      { r: [388, 484, 304, 64], tip: 'Limpar filtros', toast: 'Filtros limpos.', close: 1 }] },
    cal: { img: 'pix-calendar', s: .6, hs: [
      { r: [0, 150, 624, 474], tip: 'Escolher o período', toast: 'Período aplicado: 05/08 a 16/08.', close: 1 }] },
    aviso: { imgf: function (s) { return s.av === 'b' ? 'cx-popover-b' : 'cx-popover-a'; }, s: .6, tipx: 53, hs: [
      { r: [540, 14, 76, 80], tip: 'Fechar o aviso', close: 1 }] }
  };

  /* -------------------------------------------------------------- jornadas */
  var MISSIONS = [
    { id: 'pix', n: 1, t: 'Contestar um Pix', s: 'Do extrato ao pagamento', start: { id: 'pix-subhome' },
      text: 'Encontre uma transação no extrato, abra o menu dela e escolha Contestar.', goal: function (s) { return s.id === 'pix-pagamento'; } },
    { id: 'roubo', n: 2, t: 'Cancelar cartão por roubo', s: 'Com reemissão e confirmação', start: { id: 'cx-cartao', m: 'roubo', e: 'corr' },
      text: 'Cancele o cartão por roubo e confirme até ver o resultado.', goal: function (s) { return s.id === 'cx-resultado' && isFam(s.m); } },
    { id: 'ag', n: 3, t: 'Entrega na agência', s: 'Endereço bloqueado e aviso', start: { id: 'cx-cartao', m: 'roubo', e: 'ag' },
      text: 'Escolha um motivo com reemissão e veja o que acontece quando o cartão vai para a agência.', goal: function (s) { return s.id === 'cx-resultado' && isFam(s.m); }, keepE: true },
    { id: 'enc', n: 4, t: 'Encerrar a conta', s: 'Cancelamento sem novo cartão', start: { id: 'cx-cartao', m: 'enc' },
      text: 'Cancele o cartão por encerramento de conta e confirme.', goal: function (s) { return s.id === 'cx-resultado' && s.m === 'enc'; } }
  ];
  function mission() { return MISSIONS.filter(function (x) { return x.id === st.ms; })[0] || null; }

  /* ------------------------------------------------------------- navegação */
  function norm(s) {
    if (s.id === 'cx-entrega' && !isFam(s.m)) s.m = 'roubo';
    if (s.id === 'cx-xmotivo' && !NOFAM[s.m]) s.m = 'enc';
    if (s.id === 'cx-confirmar' || s.id === 'cx-resultado') { if (!isFam(s.m) && !NOFAM[s.m]) s.m = 'roubo'; }
    if (s.e !== 'ag') s.e = 'corr';
    if (s.av !== 'b') s.av = 'a';
    if (s.v !== '2') s.v = '1';
    if (s.bl !== '1') s.bl = '0';
    return s;
  }
  function hashOf(s) {
    var q = [];
    ['m', 'e', 'av', 'v', 'bl', 'ms'].forEach(function (k) { if (s[k] !== DEF[k]) q.push(k + '=' + encodeURIComponent(s[k])); });
    return '#' + s.id + (q.length ? '?' + q.join('&') : '');
  }
  function parseHash() {
    var h = (location.hash || '').slice(1), s = Object.assign({}, DEF);
    if (!h) return s;
    var p = h.split('?'), id = p[0];
    if (SCREENS[id]) s.id = id;
    (p[1] || '').split('&').forEach(function (kv) {
      var a = kv.split('=');
      if (a[0] in DEF && a[0] !== 'id' && a[1] !== undefined) s[a[0]] = decodeURIComponent(a[1]);
    });
    return norm(s);
  }
  function go(id, patch, replace) {
    clearTimeout(timer); pop = null;
    st = norm(Object.assign({}, st, patch || {}, { id: id }));
    if (replace) history.replaceState({ st: st, n: depth, g: gen }, '', hashOf(st));
    else { depth++; history.pushState({ st: st, n: depth, g: gen }, '', hashOf(st)); }
    render();
  }
  function back() {
    if (pop) { closePop(); return; }
    if (depth > 0) history.back();
    else toast('Você está no início desta jornada.');
  }
  window.addEventListener('popstate', function (e) {
    clearTimeout(timer); pop = null;
    if (TEST && (!e.state || e.state.g !== gen)) { history.pushState({ st: st, n: depth, g: gen }, '', hashOf(st)); render(); return; }
    if (e.state && e.state.st) { st = norm(Object.assign({}, DEF, e.state.st)); depth = e.state.n || 0; }
    else { st = parseHash(); depth = 0; }
    render();
  });
  function set(patch) {
    pop = null; st = Object.assign({}, st, patch);
    history.replaceState({ st: st, n: depth, g: gen }, '', hashOf(st));
    render();
  }

  /* ----------------------------------------------------------------- render */
  var page = $('#page'), scroller = $('#scroller'), shown = null;
  function pctRect(r, H, W) {
    W = W || W0;
    return 'left:' + (r[0] / W * 100) + '%;top:' + (r[1] / H * 100) + '%;width:' + (r[2] / W * 100) + '%;height:' + (r[3] / H * 100) + '%';
  }
  function val(x, s) { return typeof x === 'function' ? x(s) : x; }

  function mkHs(def, H, W, onclick) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'hs';
    b.style.cssText = pctRect(def.r, H, W);
    b.setAttribute('aria-label', def.tip || 'Área clicável'); b.title = def.tip || '';
    b.addEventListener('click', function (ev) { ev.stopPropagation(); onclick(def); });
    return b;
  }

  function act(def) {
    emit('hs', { def: def, screen: st.id, st: st });
    if (def.pop) { pop = { k: def.pop.k, at: def.pop.at }; renderPop(); return; }
    if (def.act === 'back') { if (def.toast) toast(def.toast); back(); return; }
    if (def.act === 'toExtrato') { scrollToY(def.y); toast('Escolha a transação que o cliente quer contestar.'); flash(); return; }
    if (def.act === 'needMotive') { toast('Selecione um motivo antes de confirmar.'); $('#frame').classList.remove('sh'); void $('#frame').offsetWidth; $('#frame').classList.add('sh'); return; }
    if (def.toast) toast(def.toast);
    if (def.to) go(def.to, def.set);
  }

  function scrollToY(y) {
    var k = page.clientWidth / W0;
    scroller.scrollTo({ top: Math.max(0, y * k - 20), behavior: window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' });
  }
  function flash() { if (TEST) return; page.classList.remove('pulse'); void page.offsetWidth; page.classList.add('pulse'); setTimeout(function () { page.classList.remove('pulse'); }, 1500); }

  function render() {
    var sc = SCREENS[st.id];
    var im = sc.img(st), sz = window.SZ[im], H = sz[1];
    var changed = shown !== st.id;
    shown = st.id; visited[st.id] = 1;
    page.style.aspectRatio = sz[0] + ' / ' + sz[1];
    page.innerHTML = '';
    var img = new Image();
    img.src = 'img/' + im + '.webp'; img.alt = val(sc.t, st) + ' do AtendeBra'; img.draggable = false;
    img.width = sz[0]; img.height = sz[1];
    page.appendChild(img);
    sc.hs(st).forEach(function (d) { page.appendChild(mkHs(d, H, W0, act)); });
    renderPop();
    if (changed) { scroller.scrollTop = 0; scroller.scrollLeft = 0; }
    page.classList.remove('pulse'); void page.offsetWidth; if (changed && !TEST) { page.classList.add('pulse'); }

    // legenda
    var mis = mission();
    var group = sc.grp === 'pix' ? 'Pix' : 'Cartão';
    var idx = Object.keys(SCREENS).filter(function (k) { return SCREENS[k].grp === sc.grp; });
    $('#kick').textContent = group + ' · tela ' + (idx.indexOf(st.id) + 1) + ' de ' + idx.length;
    $('#title').textContent = val(sc.t, st);
    $('#desc').textContent = val(sc.d, st);
    $('#barlbl').textContent = 'AtendeBra · ' + val(sc.t, st);
    document.title = val(sc.t, st) + ' · AtendeBra';
    renderMission(mis);
    renderTools(sc);
    renderRail();
    renderEnd(sc);
    $('#frame').dataset.screen = st.id;
    emit('screen', { id: st.id, st: st });

    clearTimeout(timer);
    if (sc.auto) { var id = st.id; timer = setTimeout(function () { if (st.id === id) go(sc.auto.to, null, true); }, sc.auto.ms); }
    preload(sc);
  }

  /* ---- popovers */
  function closePop() { pop = null; renderPop(); }
  function renderPop() {
    var old = page.querySelectorAll('.pop,.catch'); old.forEach(function (n) { n.remove(); });
    if (!pop) return;
    var P = POPS[pop.k], H = window.SZ[SCREENS[st.id].img(st)][1];
    var name = P.img || P.imgf(st), sz = window.SZ[name], w = sz[0] * P.s, h = sz[1] * P.s;
    var x = pop.at[0], y = pop.at[1], mode = pop.at[2];
    if (mode === 'r') x = x - w;
    if (mode === 'tip') x = x - P.tipx * P.s;
    if (x + w > W0 - 20) x = W0 - 20 - w;
    if (x < 10) x = 10;
    if (y + h > H - 10) y = Math.max(10, y - h - 56);
    var c = document.createElement('div'); c.className = 'catch';
    c.addEventListener('click', function (e) { e.stopPropagation(); closePop(); });
    page.appendChild(c);
    var d = document.createElement('div'); d.className = 'pop';
    d.style.cssText = pctRect([x, y, w, h], H);
    var im = new Image(); im.src = 'img/' + name + '.webp'; im.alt = ''; im.draggable = false; d.appendChild(im);
    P.hs.forEach(function (def) {
      var b = mkHs(def, sz[1], sz[0], function (df) {
        emit('hs', { def: df, screen: st.id, st: st, pop: pop && pop.k });
        if (df.toast) toast(df.toast);
        if (df.close) closePop();
        if (df.to) go(df.to, df.set);
      });
      d.appendChild(b);
    });
    page.appendChild(d);
    emit('pop', { k: pop.k, screen: st.id, st: st });
    if (d.scrollIntoView) d.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* ---- legenda, controles, trilho */
  function renderMission(mis) {
    var el = $('#mission');
    if (!mis) { el.hidden = true; missionDone = false; return; }
    el.hidden = false;
    var done = mis.goal(st);
    el.className = 'mission' + (done ? ' done' : '');
    el.innerHTML = '';
    var t = document.createElement('span');
    t.innerHTML = done ? '<b>Jornada concluída.</b> ' + mis.t + ' do começo ao fim.' : '<b>Jornada ' + mis.n + ': ' + mis.t + '.</b> ';
    if (!done) t.appendChild(document.createTextNode(mis.text));
    el.appendChild(t);
    var b = document.createElement('button'); b.textContent = done ? 'Escolher outra' : 'Sair da jornada';
    b.onclick = function () { set({ ms: '' }); };
    el.appendChild(b);
  }
  function renderTools(sc) {
    var el = $('#tools'); el.innerHTML = '';
    (sc.tools || []).forEach(function (t) {
      if (t.when && !t.when(st)) return;
      var w = document.createElement('div'); w.className = 'seg';
      var l = document.createElement('span'); l.textContent = t.label; w.appendChild(l);
      var g = document.createElement('div'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', t.label);
      t.opts.forEach(function (o) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = o[1];
        b.setAttribute('aria-pressed', String(st[t.k] === o[0]));
        b.onclick = function () { var p = {}; p[t.k] = o[0]; set(p); };
        g.appendChild(b);
      });
      w.appendChild(g); el.appendChild(w);
    });
  }
  function renderRail() {
    var r = $('#rail'); r.innerHTML = '';
    var h = document.createElement('h3'); h.textContent = 'Jornadas guiadas'; r.appendChild(h);
    var ms = document.createElement('div'); ms.className = 'mis';
    MISSIONS.forEach(function (m) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-current', String(st.ms === m.id));
      b.innerHTML = '<span class="n">' + m.n + '</span><strong></strong><small></small>';
      b.querySelector('strong').textContent = m.t; b.querySelector('small').textContent = m.s;
      b.onclick = function () { go(m.start.id, Object.assign({ ms: m.id, e: 'corr', m: 'roubo', bl: '0' }, m.start), false); closeRail(); };
      ms.appendChild(b);
    });
    r.appendChild(ms);
    [['pix', 'Telas do Pix'], ['card', 'Telas do cartão']].forEach(function (g) {
      var h3 = document.createElement('h3'); h3.textContent = g[1]; r.appendChild(h3);
      var nav = document.createElement('div'); nav.className = 'nav';
      Object.keys(SCREENS).forEach(function (k) {
        if (SCREENS[k].grp !== g[0]) return;
        var b = document.createElement('button'); b.type = 'button';
        b.innerHTML = '<i></i><span></span>'; b.lastChild.textContent = SCREENS[k].nav;
        b.setAttribute('aria-current', String(k === st.id)); b.dataset.v = visited[k] ? 'true' : 'false';
        b.onclick = function () { go(k, k === 'cx-cartao' ? { ms: st.ms } : {}); closeRail(); };
        nav.appendChild(b);
      });
      r.appendChild(nav);
    });
    var n = document.createElement('div'); n.className = 'note';
    n.innerHTML = '<b>Como usar.</b> Clique no que parecer clicável na tela, como atalhos, filtros, linhas do extrato, botões e o campo de motivo. Os pontos azuis marcam as telas que você já viu.';
    r.appendChild(n);
  }
  function renderEnd(sc) {
    var e = $('#end'); e.className = 'end'; e.innerHTML = '';
    if (!sc.end) return;
    e.classList.add('on');
    e.innerHTML = '<span><b>Fim do fluxo.</b> Quer ver outro caminho?</span>';
    var a = document.createElement('button'); a.textContent = 'Outro motivo';
    a.onclick = function () { go('cx-lista'); };
    var b = document.createElement('button'); b.className = 's'; b.textContent = 'Ver o fluxo do Pix';
    b.onclick = function () { go('pix-subhome'); };
    e.appendChild(a); e.appendChild(b);
  }

  /* ---- toast, preload, UI geral */
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 3600);
  }
  var preloaded = {};
  function preload(sc) {
    var names = [];
    Object.keys(SCREENS).forEach(function (k) { names.push(SCREENS[k].img(Object.assign({}, st, { id: k }))); });
    ['furto', 'fraude', 'perda'].forEach(function (m) { ['entrega', 'agencia', 'confirmar'].forEach(function (x) { names.push('cx-' + m + '-' + x); }); });
    ['enc', 'fal', 'des', 'out'].forEach(function (m) { ['motivo', 'confirmar', 'resultado'].forEach(function (x) { names.push('cx-' + m + '-' + x); }); });
    names.push('cx-roubo-agencia', 'cx-roubo-confirmar', 'pix-subhome-v02', 'ct-detalhe-blocos', 'pix-row-menu', 'pix-filter-tipo', 'pix-filter-valor', 'pix-calendar', 'cx-popover-a', 'cx-popover-b');
    (window.requestIdleCallback || function (f) { setTimeout(f, 500); })(function () {
      names.forEach(function (n) { if (window.SZ[n] && !preloaded[n]) { preloaded[n] = 1; new Image().src = 'img/' + n + '.webp'; } });
    });
  }
  function closeRail() { $('#app').classList.remove('open'); }
  function setHs(on) { $('#frame').classList.toggle('show', on); $('#hsT').checked = on; }

  $('#hsT').addEventListener('change', function (e) { setHs(e.target.checked); });
  $('#restart').addEventListener('click', function () { depth = 0; visited = {}; st = Object.assign({}, DEF); history.pushState({ st: st, n: 0 }, '', hashOf(st)); render(); });
  $('#menu').addEventListener('click', function () { $('#app').classList.toggle('open'); });
  document.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if ((e.key === 'h' || e.key === 'H') && !TEST) setHs(!$('#frame').classList.contains('show'));
    else if (e.key === 'Escape') { if (pop) closePop(); else back(); }
    else if (e.key === 'ArrowLeft' || e.key === 'Backspace') { e.preventDefault(); back(); }
  });

  /* --------------------------------------------- cliques fora de área clicável */
  page.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.hs,.catch,.pop')) return;
    emit('miss', { screen: st.id, st: st, x: e.offsetX / page.clientWidth, y: e.offsetY / page.clientHeight });
  });

  /* ---- API para o modo teste */
  window.AB = {
    test: TEST,
    on: function (ev, f) { (LST[ev] = LST[ev] || []).push(f); },
    state: function () { return st; },
    start: function (s) {   // começa uma tarefa do zero, sem histórico para trás
      gen++; clearTimeout(timer); pop = null; depth = 0; visited = {};
      st = norm(Object.assign({}, DEF, s || {}));
      history.pushState({ st: st, n: 0, g: gen }, '', hashOf(st));
      shown = null; render();
    },
    closePop: function () { if (pop) closePop(); }
  };

  /* ------------------------------------------------------------------- início */
  st = parseHash();
  history.replaceState({ st: st, n: 0, g: gen }, '', hashOf(st));
  if (TEST) { document.documentElement.classList.add('teste'); }
  render();
  if (!TEST) {
    // no primeiro acesso, as áreas clicáveis aparecem por um instante para mostrar onde clicar
    setHs(true); hsTimer = setTimeout(function () { setHs(false); }, 2600);
    $('#hsT').addEventListener('change', function () { clearTimeout(hsTimer); });
  }
})();
