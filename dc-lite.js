/* dc-lite: runtime سبک برای اجرای صفحات پروتوتایپ مهرزا به‌صورت سایت ایستا */
(function () {
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g, ONE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  var EVENTS = { onclick: 'click', oninput: 'input', onchange: 'change' };
  function look(scope, path) {
    var v = scope, parts = path.split('.');
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) { var v = look(scope, p); return v == null || v === false ? '' : String(v); });
  }
  function build(nodes, scope, out) {
    for (var k = 0; k < nodes.length; k++) {
      var n = nodes[k];
      if (n.nodeType === 3) { out.appendChild(document.createTextNode(interp(n.nodeValue, scope))); continue; }
      if (n.nodeType !== 1) continue;
      var tag = n.localName;
      if (tag === 'sc-if') {
        var m = ONE.exec(n.getAttribute('value') || ''); var val = m ? look(scope, m[1]) : n.getAttribute('value');
        if (val) build(n.childNodes, scope, out);
        continue;
      }
      if (tag === 'sc-for') {
        var m2 = ONE.exec(n.getAttribute('list') || ''); var list = (m2 && look(scope, m2[1])) || [];
        var as = n.getAttribute('as') || 'item';
        for (var j = 0; j < list.length; j++) {
          var s2 = Object.create(scope); s2[as] = list[j]; s2.index = j;
          build(n.childNodes, s2, out);
        }
        continue;
      }
      if (tag === 'helmet') continue;
      var el = document.createElementNS(n.namespaceURI, n.localName);
      for (var a = 0; a < n.attributes.length; a++) {
        var at = n.attributes[a], name = at.name, v = at.value;
        if (EVENTS[name]) {
          var mm = ONE.exec(v); var fn = mm && look(scope, mm[1]);
          if (typeof fn === 'function') { (el._h = el._h || {})[EVENTS[name]] = fn; }
          continue;
        }
        if (HOLE.test(v)) { HOLE.lastIndex = 0; var one = ONE.exec(v); if (one) { var r = look(scope, one[1]); if (r === false || r == null) continue; v = String(r); } else v = interp(v, scope); }
        HOLE.lastIndex = 0;
        el.setAttribute(name, v);
      }
      build(n.childNodes, scope, el);
      out.appendChild(el);
    }
  }
  function sync(oldN, newN) {
    var oc = oldN.childNodes, nc = newN.childNodes, i;
    for (i = 0; i < nc.length; i++) {
      var o = oc[i], n = nc[i];
      if (!o) { oldN.appendChild(n.cloneNode(true)); copyH(oldN.lastChild, n); continue; }
      if (o.nodeType !== n.nodeType || o.nodeName !== n.nodeName) { var c = n.cloneNode(true); copyH(c, n); oldN.replaceChild(c, o); continue; }
      if (n.nodeType === 3) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; continue; }
      attrs(o, n); o._h = n._h; sync(o, n);
    }
    while (oc.length > nc.length) oldN.removeChild(oldN.lastChild);
  }
  function copyH(a, b) {
    if (b._h) a._h = b._h;
    if (b.nodeType === 1) for (var i = 0; i < b.childNodes.length; i++) copyH(a.childNodes[i], b.childNodes[i]);
  }
  function attrs(o, n) {
    var i, a;
    for (i = o.attributes.length - 1; i >= 0; i--) { a = o.attributes[i]; if (!n.hasAttribute(a.name)) { o.removeAttribute(a.name); if (a.name === 'value' && 'value' in o) o.value = ''; } }
    for (i = 0; i < n.attributes.length; i++) {
      a = n.attributes[i];
      if (o.getAttribute(a.name) !== a.value) {
        o.setAttribute(a.name, a.value);
        if (a.name === 'value' && 'value' in o) o.value = a.value;
      }
    }
  }
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(p) { Object.assign(this.state, typeof p === 'function' ? p(this.state) : p); if (this.__r) this.__r(); }
    renderVals() { return {}; }
  }
  window.DCLogic = DCLogic;
  function boot() {
    var host = document.querySelector('x-dc'); if (!host) return;
    var helm = host.querySelector('helmet');
    if (helm) Array.prototype.slice.call(helm.children).forEach(function (c) { document.head.appendChild(c.cloneNode(true)); });
    var sc = document.querySelector('script[data-dc-script]');
    var Comp = new Function('DCLogic', sc.textContent + '\n;return Component;')(DCLogic);
    var inst = new Comp({}); var tpl = host;
    var frag = document.createElement('div'); frag.style.display = 'contents';
    var root = document.createElement('x-dc-root'); root.style.display = 'block';
    var pending = false;
    function render() {
      pending = false;
      var out = document.createElement('div');
      var scope = Object.assign({}, inst.renderVals());
      build(tpl.__nodes, scope, out);
      sync(root, out);
    }
    tpl.__nodes = Array.prototype.slice.call(host.childNodes);
    host.__keep = tpl.__nodes;
    var keep = tpl.__nodes.map(function (x) { return x.cloneNode(true); });
    tpl.__nodes = keep;
    host.textContent = ''; host.appendChild(root);
    root.addEventListener('click', ev => dispatch(ev, 'click'));
    root.addEventListener('input', ev => dispatch(ev, 'input'));
    root.addEventListener('change', ev => dispatch(ev, 'change'));
    function dispatch(ev, type) {
      var t = ev.target;
      while (t && t !== root) { if (t._h && t._h[type]) { t._h[type].call(inst, ev); return; } t = t.parentNode; }
    }
    inst.__r = function () { if (!pending) { pending = true; Promise.resolve().then(render); } };
    render();
    document.documentElement.setAttribute('data-ready', '1');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
