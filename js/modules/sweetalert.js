// @flow

import swal from 'sweetalert'
import _ from 'lodash'

/**
 * Promisified sweetalert.js
 * @param  {Object}  params SweetAlert options object
 * @return {Promise}
 */
export default function(
  params: {
    title: string,
    text: string,
    type: 'warning' | 'error' | 'success' | 'info' | 'input'
  }
) {
  return new Promise((resolve, reject) =>
    swal(

      _.defaults(params, {
        allowOutsideClick: true,
        showConfirmButton: true
      }),

      arg => {
        if (_.isNil(arg)) {
          resolve()
        } else {
          if (_.isString(arg)) {
            if (arg.trim()) resolve(arg.trim())
            else reject(swal)
          } else {
            if (arg) resolve()
            else reject()
          }
        }
      }

    )
  )
}
