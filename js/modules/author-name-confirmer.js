// @flow

import swal from './sweetalert'

export default function(
  matches: Array<Object>,
  state: {
    replaced: Array<Array<Object>>,
    cancelFlag: boolean
  }
) {
  return async () => {
    try {
      if (matches.length === 1) {

        state.cancelFlag = false
        const name = matches[0].author.name
        await swal({
          title: 'Please confirm',
          type: 'warning',
          text: `Did you mean ${name}?`,
          showCancelButton: true,
          confirmButtonText: `Whoops – yes, I meant “${name}”`,
          cancelButtonText: `No, “${matches[0].submitted.name}” is correct`
        })
        state.replaced.push(matches)

      } else {

        const matchList = matches.map(match => match.author.name)
        await swal({
          title: 'Please confirm',
          type: 'warning',
          text: `We have found the following authors in ArcBase with similar names:\n\n${
            matchList.join('\n')
          }\n\nDo you want to go back and correct your spelling?`,
          showCancelButton: true,
          confirmButtonText: `No, “${matches[0].submitted.name}” is correct`,
          cancelButtonText: 'Yes, I made a mistake, take me back'
        })
        state.cancelFlag = false
      }

    } catch (e) {
      console.error(e)
    }
  }
}
