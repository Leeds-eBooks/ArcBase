import swal from 'sweetalert'
import _ from 'lodash'
import Promise from 'bluebird'

/**
 * Promisified sweetalert.js
 * @param  {Object}  params SweetAlert options object
 * @return {Promise}
 */
export default function(params) {
  return new Promise((resolve, reject) =>
    swal(

      _.defaults(params, {
        allowOutsideClick: true,
        showConfirmButton: true,
        confirmButtonColor: '#2dccd3'
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
