import _ from './underscore'
import parseG from 'parse'
const Parse = parseG.Parse
import {model} from './index'
import {saved, failed} from './ui'

export const Contact = Parse.Object.extend("Contact")

export default function() {
  const query = new Parse.Query(Contact)

  let contacts = []

  query.find().then(res => contacts.push(...res))

  return function(event, scope) {
    if (!this.value.trim()) {
      model.foundContacts.splice(0, model.foundContacts.length)
      return false
    }

    contacts.forEach(contact => {
      const data = _.values(contact.toJSON()).toString().toLowerCase()

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
  (contact, el) => {
    contact.save().then(
      () => saved(el),
      () => failed(el)
    )
  },
  500
)
