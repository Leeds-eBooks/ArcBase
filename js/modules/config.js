// @flow

import 'sightglass'
import _ from 'lodash'
import rivets from 'rivets'
import {alphaNumeric, formatISBN} from './util'
import moment from 'moment'

rivets.binders.readonly = (el, value) => el.readOnly = Boolean(value)

rivets.formatters.opposite = value => !value
rivets.formatters.prepend = (value, prep) => prep ? `${prep}${value}` : value
rivets.formatters.alphaNumeric = v => alphaNumeric(v)
rivets.formatters.linebreaks = v => _.isString(v) ? v.replace(/\n/g, '<br>') : ''

rivets.formatters.arrayAt = {
  arr: [], // FIXME will this work when there are multiple array elements?
  read(v, i) {
    this.arr = v
    return v[i]
  },
  publish(v, i) { // to server
    this.arr[i] = v
    return this.arr
  }
}

rivets.formatters.parseDate = {
  read: v => v && moment(v).format('YYYY-MM-DD'),
  publish: v => v && moment(v).toISOString()
}

rivets.formatters.toBool = {
  read: v => v,
  publish: v => ({true: true, false: false}[v])
}

rivets.formatters.getBibliographicDetails = book => {
  const {pbk, hbk, ebk} = book.ISBNs,
        {pages} = book;

  let str = '';

  if (pbk) str += `ISBN pbk ${formatISBN(pbk)}`
  if (hbk) str += `\nISBN hbk ${formatISBN(hbk)}`
  if (ebk) str += `\nISBN ebk ${formatISBN(ebk)}`
  if (pages) str += `\n${pages} pages`

  return str
}
