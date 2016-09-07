// @flow

import _ from 'lodash'
import {saved, failed} from './ui'
import {rebuildArray} from './util'
import Lazy from 'lazy.js'

const contacts = []

async function refreshContacts(contacts = contacts) {
  const query = new Kinvey.Query(),
        res = await Kinvey.DataStore.find('Contact', query);
  rebuildArray(contacts, res)
}

export default function(model: Object) {
  refreshContacts(contacts)

  return function() {
    const query = this.value.trim().toLowerCase()

    if (query) {
      rebuildArray(
        model.foundContacts,
        Lazy(contacts)
          .filter(contact =>
            JSON.stringify(
              _.compact(Object.values(contact))
            ).toLowerCase().includes(query)
          )
          .toArray()
      )
    } else {
      rebuildArray(model.foundContacts, [])
    }
  }
}

const refreshContactsDebounced = _.debounce(refreshContacts, 2000)

export const updateContact = _.debounce(
  async function(contact, el) {
    try {
      await Kinvey.DataStore.update('Contact', contact)
      saved(el)
      refreshContactsDebounced(contacts)
    } catch (e) {
      failed(el)
    }
  },
  500
)

export async function deleteContact(contact: Object, foundList: Array<Object>) {
  const confirmMessage = 'Are you sure you want to delete this contact? You cannot undo this action!'
  if (window.confirm(confirmMessage)) {
    const foundIndex = foundList.indexOf(contact)
    try {
      await Kinvey.DataStore.destroy('Contact', contact._id)
      await refreshContacts(contacts)
      if (foundIndex >= 0) foundList.splice(foundIndex, 1)
    } catch (e) {
      console.error(e)
    }
  }
}
