import _ from './underscore'
import {model} from './index'
import {saved, failed} from './ui'

export default function() {
  const query = new Kinvey.Query()

  let contacts = []

  Kinvey.DataStore.find('Contact', query).then(res => contacts.push(...res))

  return function() {
    if (!this.value.trim()) {
      model.foundContacts.splice(0, model.foundContacts.length)
      return false
    }

    contacts.forEach(contact => {
      const data = JSON.stringify(_.compact(_.values(contact))).toLowerCase()

      if (data.includes(this.value.toLowerCase())) {
        if (!model.foundContacts.includes(contact)) {
          model.foundContacts.push(contact)
        }
      } else {
        let i = model.foundContacts.indexOf(contact)
        if (i > -1) model.foundContacts.splice(i, 1)
      }
    })
  }
}

export const updateContact = _.debounce(
  (contact, el) =>
    Kinvey.DataStore.update('Contact', contact)
    .then(() => saved(el))
    .catch(() => failed(el)),
  500
)
