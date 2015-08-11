import 'sightglass'

import _ from './underscore'
import humane from './humane'

import rivets from 'rivets'
import {alphaNumeric} from './functions'

if (!String.prototype.insert) {
  Object.defineProperty(
    String.prototype, 'insert', {
      enumerable: false,
      value(index, substr) {
        return this.substring(0, index) + substr + this.substr(index)
      }
    }
  )
}

rivets.adapters['#'] = {
  observe(obj, keypath, cb) {obj.on(`change:${keypath}`, cb)},
  unobserve(obj, keypath, cb) {obj.off(`change:${keypath}`, cb)},
  get: (obj, keypath) => obj && obj.get(keypath),
  set: (obj, keypath, value) => obj && obj.set(keypath, value)
}

rivets.adapters['+'] = _.clone(rivets.adapters['#'])
rivets.adapters['+'].set = (obj, keypath, value) => {
  if (obj) {
    humane.remove()
    humane.info('saving...')
    obj.set(keypath, value)
    obj.save().then(
      () => {
        humane.remove()
        humane.success(`saved ${keypath}`)
      },
      () => {
        humane.remove()
        humane.error(`failed to save ${keypath}`)
      }
    )
  }
}

rivets.binders['value-debounced'] = _.clone(rivets.binders.value)
rivets.binders['value-debounced'].bind = function(el) {
  if (!(el.tagName === 'INPUT' && el.type === 'radio')) {
    this.event = el.tagName === 'SELECT' ? 'change' : 'input'
    return el.addEventListener(this.event, _.debounce(this.publish, 300), false)
  }
}

rivets.binders.readonly = (el, value) => {el.readOnly = !!value}

// rivets.binders['value-in-array'] = (el, value) => {
//   // TODO
// }

rivets.formatters.opposite = value => !value
rivets.formatters.prepend = (value, prep) => prep ? `${prep}${value}` : value
rivets.formatters.alphaNumeric = v => alphaNumeric(v)
rivets.formatters.linebreaks = v => _.isString(v) ? v.replace(/\n/g, '<br>') : ''
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
    const d = new Date(v);
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
