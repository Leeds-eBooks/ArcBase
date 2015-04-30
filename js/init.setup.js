Parse.initialize(ArcBase.keys.Parse.a,ArcBase.keys.Parse.b);
var table=document.querySelector('#main table'),
    Book=Parse.Object.extend("Book"),
    Author=Parse.Object.extend("Author"),
    notesOverlay=document.querySelector('.notes-overlay'),
    authorOverlay=document.querySelector('.author-overlay'),
    longOverlay=document.querySelector('.long-overlay'),
    model;

if (!Array.prototype.pushUnique) {
  Object.defineProperty(
    Array.prototype, 'pushUnique', {
      enumerable: false,
      value: function(item) {
        if (!~this.indexOf(item)) {
          return this.push(item);
        } else {
          return false;
        }
      }
    }
  );
}

function alphaNumeric(str, replacement='-') {
  return str.replace(/\W+/g, replacement);
}

rivets.adapters['#'] = {
  observe(obj, keypath, cb) {
    obj.on('update:' + keypath, cb);
  },
  unobserve(obj, keypath, cb) {
    obj.off('update:' + keypath, cb);
  },
  get(obj, keypath) {
    return obj && obj.get(keypath);
  },
  set(obj, keypath, value) {
    return obj && obj.set(keypath, value);
  }
};

rivets.binders.readonly=function(el, value) {
  el.readOnly=!!value;
};

rivets.formatters.opposite=function(value) {
  return !value;
};
rivets.formatters.prepend=function(value, string) {
  return string ? string+""+value : value;
};
rivets.formatters.alphaNumeric=function(v) {
  return alphaNumeric(v);
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
  read(v) {return v;},
  publish(v) { // to server
    return {'true': true, 'false': false}[v];
  }
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
