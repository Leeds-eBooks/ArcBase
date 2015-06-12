Parse.initialize(ArcBase.keys.Parse.a, ArcBase.keys.Parse.b);

var table = document.querySelector('#main table'),
    Book = Parse.Object.extend("Book"),
    Author = Parse.Object.extend("Author"),
    parseBookMap = new Map(),
    notesOverlay = document.querySelector('.notes-overlay'),
    authorOverlay = document.querySelector('.author-overlay'),
    longOverlay = document.querySelector('.long-overlay'),
    model, rivetsView;

humane.error = humane.spawn({
  addnCls: 'humane-flatty-error',
  timeout: 8000,
  clickToClose: true
});

function alphaNumeric(str, replacement = '-') {
  return str.replace(/\W+/g, replacement);
}

rivets.adapters['#'] = {
  observe(obj, keypath, cb) {obj.on('change:' + keypath, cb);},
  unobserve(obj, keypath, cb) {obj.off('change:' + keypath, cb);},
  get: (obj, keypath) => obj && obj.get(keypath),
  set: (obj, keypath, value) => obj && obj.set(keypath, value)
};

rivets.binders.readonly = (el, value) => {
  el.readOnly = !!value;
};

rivets.binders['value-in-array'] = (el, value) => {
  // TODO
};

rivets.formatters.opposite = value => !value;
rivets.formatters.prepend = (value, string) => string ? string + "" + value : value;
rivets.formatters.alphaNumeric = v => alphaNumeric(v);
rivets.formatters.linebreaks = v => v.replace(/\n/g, '<br>');
// rivets.formatters.ifUndef = function(v, def) {
//   if (!v) return def;
// };

rivets.formatters.arrayAt = {
  arr: [], // FIXME will this work when there are multiple array elements?
  read(v, i) {
    this.arr = v;
    return v[i];
  },
  publish(v, i) { // to server
    this.arr[i] = v;
    return this.arr;
  }
};

rivets.formatters.parseDate = {
  read(v) { // from server
    var d = new Date(v);
    if (!v) return null;
    return [
      d.getFullYear(),
      ("0" + (d.getMonth() + 1)).slice(-2),
      ("0" + d.getDate()).slice(-2)
    ].join('-');
  },
  publish(v) { // to server
    if (!v) return null;
    return new Date(v);
  }
};

rivets.formatters.toBool = {
  read: v => v,
  publish: v => ({'true': true, 'false': false}[v]) // to server
};

if (!String.prototype.insert) {
  Object.defineProperty(
    String.prototype, 'insert', {
      enumerable: false,
      value: function(index, substr) {
        return this.substring(0, index) + substr + this.substr(index);
      }
    }
  );
}
