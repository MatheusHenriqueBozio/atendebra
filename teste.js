/* AtendeBra · modo teste de usabilidade
   Abra com ?teste=1 (opcional: &p=P01 para já preencher o código do participante).
   Esconde as ajudas do protótipo, apresenta as tarefas uma a uma e mede tempo, cliques,
   cliques fora de área clicável (misclicks), caminho, a nota de facilidade (SEQ) e o SUS.
   No fim, os resultados são copiados para colar na planilha. */
(function () {
  'use strict';

  /* Cole aqui o ID do projeto do Microsoft Clarity (Settings → Overview → Project ID).
     Vazio = sem Clarity. Com ID, o Clarity grava as sessões nos dois modos e marca as do teste. */
  var CLARITY_ID = '';

  var AB = window.AB;
  if (!AB) return;

  if (CLARITY_ID) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
    window.clarity('set', 'modo', AB.test ? 'teste' : 'livre');
  }
  function cl() { if (window.clarity) { try { window.clarity.apply(null, arguments); } catch (e) { /* sem Clarity */ } } }

  if (!AB.test) return;

  /* ---------------------------------------------------------------- tarefas */
  var VALOR_LINHAS = { 'pix-subhome': [2], 'pix-extrato': [3, 14] };   // linhas com o Pix de R$ 24,50
  var Y0 = { 'pix-subhome': 1664, 'pix-extrato': 986 };

  var TASKS = [
    { id: 'T1', title: 'Limite do Pix',
      text: 'Você está atendendo a Maria da Silva Santos. Ela quer saber quanto do limite de Pix durante o dia ela já usou. Encontre essa informação.',
      start: { id: 'pix-subhome' },
      ideal: [['pix-subhome']],
      q: { text: 'Quanto do limite de Pix durante o dia a cliente já usou?',
           opts: ['R$ 4.540,00', 'R$ 5.000,00', 'R$ 400,00', 'Não encontrei'], ok: 0 } },

    { id: 'T2', title: 'Contestar um Pix',
      text: 'A Maria diz que não reconhece um Pix de R$ 24,50 que aparece na conta dela. Abra a contestação desse Pix.',
      start: { id: 'pix-subhome' },
      ideal: [['pix-subhome', 'pix-pagamento'], ['pix-subhome', 'pix-extrato', 'pix-pagamento']],
      onHs: function (ev, run) {
        if (ev.def.tip === 'Contestar este Pix') {
          return run.rowOk ? { ok: true } : { ok: false, note: 'contestou outra transação' };
        }
      } },

    { id: 'T3', title: 'Cancelar cartão por roubo',
      text: 'O cartão de débito da conta foi roubado. Cancele o cartão e conclua o atendimento.',
      start: { id: 'cx-cartao', m: 'roubo', e: 'corr' },
      ideal: [['cx-cartao', 'cx-motivo', 'cx-lista', 'cx-entrega', 'cx-confirmar', 'cx-processando', 'cx-resultado']],
      onScreen: function (ev) {
        if (ev.id === 'cx-resultado') return ev.st.m === 'roubo' ? { ok: true } : { ok: false, note: 'motivo escolhido: ' + (MOT[ev.st.m] || ev.st.m) };
      },
      q: { text: 'O cliente pergunta quanto vai custar o novo cartão e quando ele chega. O que você responde?',
           opts: ['R$ 8,10, e chega em até 10 dias úteis', 'Não tem custo, e chega em até 10 dias úteis', 'R$ 8,10, e chega em até 5 dias úteis', 'Não reparei nessa informação'], ok: 0 } },

    { id: 'T4', title: 'Endereço de entrega',
      text: 'Outro cliente perdeu o cartão de débito e quer receber o novo cartão em casa. Comece o cancelamento e descubra se dá para trocar o endereço de entrega. Quando souber a resposta, clique em Terminei.',
      start: { id: 'cx-cartao', m: 'perda', e: 'ag' },
      ideal: [['cx-cartao', 'cx-motivo', 'cx-lista', 'cx-entrega']],
      q: { text: 'O que você explica ao cliente?',
           opts: ['Não dá: o endereço é o da agência da conta, por escolha do próprio cliente', 'Dá: é só alterar o endereço antes de confirmar', 'Não dá: cartão perdido não tem um novo cartão', 'Não descobri'], ok: 0 } },

    { id: 'T5', title: 'Cancelar por encerramento',
      text: 'Um cliente vai encerrar a conta e pediu para cancelar o cartão de débito. Faça o cancelamento até o fim.',
      start: { id: 'cx-cartao', m: 'roubo', e: 'corr' },
      ideal: [['cx-cartao', 'cx-motivo', 'cx-lista', 'cx-xmotivo', 'cx-confirmar', 'cx-processando', 'cx-resultado']],
      onScreen: function (ev) {
        if (ev.id === 'cx-resultado') return ev.st.m === 'enc' ? { ok: true } : { ok: false, note: 'motivo escolhido: ' + (MOT[ev.st.m] || ev.st.m) };
      } }
  ];

  var SUS = [
    'Eu acho que gostaria de usar este sistema com frequência.',
    'Eu achei o sistema desnecessariamente complexo.',
    'Eu achei o sistema fácil de usar.',
    'Eu acho que precisaria da ajuda de uma pessoa com conhecimentos técnicos para usar o sistema.',
    'Eu achei que as várias funções do sistema estão muito bem integradas.',
    'Eu achei que o sistema apresenta muita inconsistência.',
    'Eu imagino que as pessoas aprenderão a usar este sistema rapidamente.',
    'Eu achei o sistema muito complicado de usar.',
    'Eu me senti muito confiante ao usar o sistema.',
    'Eu precisei aprender várias coisas novas antes de conseguir usar o sistema.'
  ];

  /* ----------------------------------------------------------------- estado */
  var KEY = 'atendebra-teste-v1';
  var R = null;      // resultados do participante: { p, data, i, tasks: [], sus: [], com: '' , fim: bool }
  var run = null;    // tarefa em andamento
  function save() { try { localStorage.setItem(KEY, JSON.stringify(R)); } catch (e) { /* sem storage */ } }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function hoje() { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* --------------------------------------------------------------- interface */
  document.querySelector('.brand .tag').textContent = 'Teste de usabilidade';
  document.title = 'Teste de usabilidade · AtendeBra';
  var main = document.querySelector('.main');
  var bar = el('div', 'tbar'); bar.hidden = true;
  main.insertBefore(bar, main.firstChild);
  var ov = el('div', 'tmodal'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  document.body.appendChild(ov);
  function modal(html) {
    ov.innerHTML = ''; var card = el('div', 'txc', html); ov.appendChild(card); ov.hidden = false;
    var f = card.querySelector('input,button'); if (f) f.focus();
    return card;
  }
  function hideModal() { ov.hidden = true; ov.innerHTML = ''; }

  /* ---------------------------------------------------------------- medições */
  AB.on('screen', function (ev) {
    if (!run || run.end) return;
    if (run.path[run.path.length - 1] !== ev.id) run.path.push(ev.id);
    if (TASKS[R.i].onScreen) { var r = TASKS[R.i].onScreen(ev, run); if (r) finish('auto', r); }
  });
  AB.on('hs', function (ev) {
    if (!run || run.end) return;
    run.clicks++;
    if (ev.def.tip === 'Abrir o menu da transação' && Y0[ev.screen]) {
      var idx = Math.round((ev.def.r[1] + ev.def.r[3] / 2 - Y0[ev.screen]) / 98);
      run.row = (ev.screen === 'pix-subhome' ? 'visão geral' : 'extrato') + ' linha ' + (idx + 1);
      run.rowOk = (VALOR_LINHAS[ev.screen] || []).indexOf(idx) >= 0;
    }
    if (ev.pop) run.pops.push(ev.pop);
    if (TASKS[R.i].onHs) { var r = TASKS[R.i].onHs(ev, run); if (r) finish('auto', r); }
  });
  AB.on('pop', function (ev) { if (run && !run.end && run.opened.indexOf(ev.k) < 0) run.opened.push(ev.k); });
  AB.on('miss', function () {
    if (!run || run.end) return;
    run.clicks++; run.miss++;
    cl('event', 'misclick');
  });

  /* ------------------------------------------------------------------ fluxo */
  function intro() {
    var prev = load();
    var qp = (location.search.match(/[?&]p=([^&]+)/) || [])[1];
    var html = '<div class="k">Teste de usabilidade</div><h2>Obrigado por participar</h2>' +
      '<p>Vamos testar uma ferramenta de atendimento bancário, não você. Não existe resposta certa ou errada: se algo ficar confuso, é exatamente isso que queremos descobrir.</p>' +
      '<ul><li>São <b>' + TASKS.length + ' tarefas curtas</b>, com algumas perguntas no fim. Leva uns 15 minutos.</li>' +
      '<li>Leia a tarefa, clique em <b>Começar tarefa</b> e use a tela como faria no trabalho. Se travar, pode clicar em <b>Desisti</b>.</li>' +
      '<li>Todos os dados de clientes são fictícios. Registramos seus cliques, o tempo de cada tarefa e as respostas, só para este estudo' + (CLARITY_ID ? ', e a sessão é gravada em vídeo (sem áudio)' : '') + '.</li></ul>' +
      (window.innerWidth < 900 ? '<p class="warn">Este teste foi feito para computador. Se possível, abra este link em uma tela maior.</p>' : '') +
      '<label class="fld">Código do participante<input id="txp" autocomplete="off" placeholder="P01" value="' + esc(qp ? decodeURIComponent(qp) : (prev && !prev.fim ? prev.p : '')) + '"></label>' +
      '<label class="chk"><input type="checkbox" id="txok"> Li e concordo em participar.</label>' +
      '<div class="acts"><button class="btn pri" id="txgo">Começar</button>' +
      (prev && !prev.fim && prev.tasks.length ? '<button class="btn" id="txres">Retomar ' + esc(prev.p) + ' (tarefa ' + (prev.i + 1) + ')</button>' : '') + '</div>';
    var c = modal(html);
    c.querySelector('#txgo').onclick = function () {
      var p = c.querySelector('#txp').value.trim();
      if (!p) { c.querySelector('#txp').focus(); c.querySelector('#txp').classList.add('err'); return; }
      if (!c.querySelector('#txok').checked) { c.querySelector('.chk').classList.add('err'); return; }
      R = { p: p, data: hoje(), i: 0, tasks: [], sus: [], com: '', fim: false };
      save();
      cl('identify', p); cl('set', 'participante', p); cl('upgrade', 'teste de usabilidade');
      taskIntro();
    };
    var rs = c.querySelector('#txres');
    if (rs) rs.onclick = function () { R = prev; cl('identify', R.p); cl('set', 'participante', R.p); taskIntro(); };
  }

  function taskIntro() {
    if (R.i >= TASKS.length) { susForm(); return; }
    var t = TASKS[R.i];
    bar.hidden = true;
    var c = modal('<div class="k">Tarefa ' + (R.i + 1) + ' de ' + TASKS.length + '</div><p class="sc">' + esc(t.text) + '</p>' +
      '<div class="acts"><button class="btn pri" id="txst">Começar tarefa</button></div>');
    c.querySelector('#txst').onclick = startTask;
  }

  function startTask() {
    var t = TASKS[R.i];
    hideModal();
    run = { t0: now(), clicks: 0, miss: 0, path: [], pops: [], opened: [], row: '', rowOk: false, end: null };
    AB.start(t.start);
    bar.hidden = false;
    bar.innerHTML = '<div class="tn">Tarefa ' + (R.i + 1) + ' de ' + TASKS.length + '</div><p>' + esc(t.text) + '</p>' +
      '<button class="btn pri" id="tbok">Terminei</button><button class="btn" id="tbx">Desisti</button>';
    bar.querySelector('#tbok').onclick = function () { finish('terminei'); };
    bar.querySelector('#tbx').onclick = function () { finish('desisti'); };
    cl('event', t.id + '_inicio'); cl('set', 'tarefa', t.id);
  }

  function finish(how, r) {
    if (!run || run.end) return;
    var t = TASKS[R.i];
    run.end = how; run.t1 = now(); run.auto = r || null;
    AB.closePop();
    bar.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    cl('event', t.id + '_' + (how === 'auto' ? (r.ok ? 'sucesso' : 'falha') : how));
    var go = function () {
      if (how === 'desisti') { seq(null); return; }
      if (t.q) question(t); else seq(null);
    };
    if (how === 'auto') setTimeout(function () { modal('<div class="k">Tarefa ' + (R.i + 1) + ' registrada</div><p>Pronto. Agora duas perguntas rápidas.</p>'); setTimeout(go, 1100); }, 900);
    else go();
  }

  function question(t) {
    var c = modal('<div class="k">Tarefa ' + (R.i + 1) + '</div><p class="q">' + esc(t.q.text) + '</p><div class="opts">' +
      t.q.opts.map(function (o, i) { return '<label class="op"><input type="radio" name="txq" value="' + i + '"> ' + esc(o) + '</label>'; }).join('') +
      '</div><div class="acts"><button class="btn pri" id="txn">Continuar</button></div>');
    c.querySelector('#txn').onclick = function () {
      var v = c.querySelector('input[name=txq]:checked');
      if (!v) { c.querySelector('.opts').classList.add('err'); return; }
      seq(+v.value);
    };
  }

  function seq(ans) {
    var lab = ['Muito difícil', '', '', '', '', '', 'Muito fácil'];
    var c = modal('<div class="k">Tarefa ' + (R.i + 1) + '</div><p class="q">No geral, essa tarefa foi:</p><div class="scale">' +
      lab.map(function (l, i) { return '<label><input type="radio" name="txs" value="' + (i + 1) + '"><span>' + (i + 1) + '</span><small>' + l + '</small></label>'; }).join('') +
      '</div><div class="acts"><button class="btn pri" id="txn">' + (R.i + 1 < TASKS.length ? 'Próxima tarefa' : 'Continuar') + '</button></div>');
    c.querySelector('#txn').onclick = function () {
      var v = c.querySelector('input[name=txs]:checked');
      if (!v) { c.querySelector('.scale').classList.add('err'); return; }
      record(ans, +v.value);
      R.i++; save(); run = null;
      taskIntro();
    };
  }

  var MOT = { roubo: 'Roubo', furto: 'Furto', fraude: 'Fraude', perda: 'Perda', enc: 'Encerramento de conta', fal: 'Falecimento', des: 'Desinteresse', out: 'Outros' };
  var TELA = { 'pix-subhome': 'Visão geral', 'pix-extrato': 'Extrato', 'pix-detalhe': 'Detalhe', 'pix-pagamento': 'Pagamento', 'pix-contatos': 'Contatos',
    'cx-cartao': 'Cartão', 'cx-motivo': 'Motivo', 'cx-lista': 'Lista de motivos', 'cx-entrega': 'Entrega', 'cx-endereco': 'Alterar endereço',
    'cx-xmotivo': 'Motivo sem reemissão', 'cx-confirmar': 'Confirmação', 'cx-processando': 'Processando', 'cx-resultado': 'Resultado' };
  function sameAs(path, ideal) { return path.length === ideal.length && path.every(function (x, i) { return x === ideal[i]; }); }

  function record(ans, seqv) {
    var t = TASKS[R.i], q = t.q;
    var correct = (q && ans != null) ? (ans === q.ok ? 1 : 0) : '';
    var ok;
    if (run.end === 'desisti') ok = 0;
    else if (t.onScreen || t.onHs) ok = (run.auto && run.auto.ok) ? 1 : 0;
    else ok = correct === 1 ? 1 : 0;
    var direto = ok && t.ideal.some(function (p) { return sameAs(run.path, p); }) ? 1 : 0;
    var notes = [];
    if (run.auto && run.auto.note) notes.push(run.auto.note);
    if (t.id === 'T2' && run.row) notes.push('linha aberta: ' + run.row);
    if (t.id === 'T4') notes.push(run.opened.indexOf('aviso') >= 0 ? 'abriu o aviso do endereço' : 'não abriu o aviso do endereço');
    if ((t.onScreen || t.onHs) && run.end === 'terminei') notes.push('clicou em Terminei sem chegar ao fim do fluxo');
    R.tasks.push({
      tarefa: t.id, titulo: t.title,
      resultado: run.end === 'desisti' ? 'desistiu' : ok ? (direto ? 'sucesso direto' : 'sucesso indireto') : 'falha',
      sucesso: ok, direto: direto,
      resposta: q && ans != null ? q.opts[ans] : '', correta: correct,
      tempo: Math.round(((run.t1 || now()) - run.t0) / 1000),
      cliques: run.clicks, miss: run.miss, telas: run.path.length,
      caminho: run.path.map(function (x) { return TELA[x] || x; }).join(' > '), obs: notes.join(' | '), seq: seqv
    });
  }

  function susForm() {
    bar.hidden = true;
    var c = modal('<div class="k">Para terminar</div><p class="q">Sobre a ferramenta que você usou, marque o quanto concorda com cada frase.</p>' +
      '<div class="sus"><div class="sh"><span></span><small>Discordo totalmente</small><small></small><small></small><small></small><small>Concordo totalmente</small></div>' +
      SUS.map(function (s, i) {
        return '<div class="sr" data-i="' + i + '"><span>' + (i + 1) + '. ' + esc(s) + '</span>' +
          [1, 2, 3, 4, 5].map(function (v) { return '<label><input type="radio" name="sus' + i + '" value="' + v + '" aria-label="' + v + '"><b>' + v + '</b></label>'; }).join('') + '</div>';
      }).join('') + '</div>' +
      '<label class="fld">O que foi mais confuso ou estranho? (opcional)<textarea id="txcom" rows="3"></textarea></label>' +
      '<div class="acts"><button class="btn pri" id="txn">Enviar respostas</button></div>');
    c.classList.add('wide');
    c.querySelector('#txn').onclick = function () {
      var vals = [], miss = false;
      SUS.forEach(function (s, i) {
        var v = c.querySelector('input[name=sus' + i + ']:checked');
        c.querySelector('.sr[data-i="' + i + '"]').classList.toggle('err', !v);
        if (!v) miss = true; else vals.push(+v.value);
      });
      if (miss) { var e = c.querySelector('.sr.err'); if (e) e.scrollIntoView({ block: 'center' }); return; }
      R.sus = vals; R.com = c.querySelector('#txcom').value.trim(); R.fim = true; save();
      cl('event', 'teste_concluido');
      results();
    };
  }

  function susScore(v) { var s = 0; v.forEach(function (x, i) { s += i % 2 === 0 ? x - 1 : 5 - x; }); return s * 2.5; }
  function clean(x) { return String(x == null ? '' : x).replace(/[\t\r\n;]+/g, ' ').trim(); }
  function taskRows() {
    return R.tasks.map(function (t) {
      return [R.p, R.data, t.tarefa, t.titulo, t.resultado, t.sucesso, t.direto, t.resposta, t.correta, t.tempo, t.cliques, t.miss, t.telas, t.caminho, t.obs, t.seq].map(clean);
    });
  }
  function susRow() { return [R.p, R.data].concat(R.sus).concat([R.com]).map(clean); }
  var TH = ['participante', 'data', 'tarefa', 'titulo', 'resultado', 'sucesso', 'direto', 'resposta', 'resposta_correta', 'tempo_s', 'cliques', 'misclicks', 'telas', 'caminho', 'observacao', 'seq'];
  var SH = ['participante', 'data', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'comentario'];

  function copy(text, btn) {
    var done = function () { var o = btn.textContent; btn.textContent = 'Copiado ✓'; setTimeout(function () { btn.textContent = o; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    else fallback();
    function fallback() { var ta = el('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { /* nada */ } ta.remove(); }
  }
  function download(name, head, rows) {
    var csv = '﻿' + [head].concat(rows).map(function (r) { return r.join(';'); }).join('\r\n');
    var a = el('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function results() {
    bar.hidden = true;
    var rows = R.tasks.map(function (t) {
      return '<tr><td>' + t.tarefa + '</td><td>' + esc(t.titulo) + '</td><td>' + esc(t.resultado) + '</td><td>' + t.tempo + ' s</td><td>' + t.miss + '</td><td>' + t.seq + '</td></tr>';
    }).join('');
    var c = modal('<div class="k">Teste concluído · ' + esc(R.p) + '</div><h2>Obrigado!</h2>' +
      '<p>Se você fez o teste sozinho, clique em <b>Copiar tudo</b> e cole na conversa com quem te enviou o link.</p>' +
      '<table class="res"><thead><tr><th></th><th>Tarefa</th><th>Resultado</th><th>Tempo</th><th>Misclicks</th><th>Facilidade</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="sm">SUS deste participante: <b>' + String(susScore(R.sus)).replace('.', ',') + '</b> de 100.</p>' +
      '<div class="acts wrap"><button class="btn pri" id="cpall">Copiar tudo</button><button class="btn" id="cpt">Copiar tarefas</button><button class="btn" id="cps">Copiar SUS</button>' +
      '<button class="btn" id="dl">Baixar CSV</button><button class="btn" id="nv">Novo participante</button></div>' +
      '<p class="sm">Na planilha: <b>Copiar tarefas</b> → cole na primeira linha vazia da aba Dados_tarefas. <b>Copiar SUS</b> → aba Dados_SUS.</p>');
    c.classList.add('wide');
    var tsv = function (rs) { return rs.map(function (r) { return r.join('\t'); }).join('\n'); };
    c.querySelector('#cpt').onclick = function () { copy(tsv(taskRows()), this); };
    c.querySelector('#cps').onclick = function () { copy(tsv([susRow()]), this); };
    c.querySelector('#cpall').onclick = function () { copy('TAREFAS\n' + tsv(taskRows()) + '\n\nSUS\n' + tsv([susRow()]), this); };
    c.querySelector('#dl').onclick = function () {
      download('atendebra-' + R.p + '-tarefas.csv', TH, taskRows());
      setTimeout(function () { download('atendebra-' + R.p + '-sus.csv', SH, [susRow()]); }, 400);
    };
    c.querySelector('#nv').onclick = function () { try { localStorage.removeItem(KEY); } catch (e) { /* nada */ } location.href = location.pathname + '?teste=1'; };
  }

  /* --------------------------------------------------------------- início */
  var saved = load();
  if (saved && saved.fim && /[?&]resultado=1\b/.test(location.search)) { R = saved; results(); }
  else intro();
  window.ABT = { tasks: TASKS, results: function () { return R; }, susScore: susScore };
})();
