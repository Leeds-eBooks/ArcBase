// @flow

import humane from 'humane-js'

Object.assign(humane, {
  success: humane.spawn({
    addnCls: 'humane-flatty-success',
    timeout: 5000
  }),
  info: humane.spawn({
    addnCls: 'humane-flatty-info',
    timeout: 10000,
    clickToClose: true
  }),
  error: humane.spawn({
    addnCls: 'humane-flatty-error',
    timeout: 20000,
    clickToClose: true
  })
})

export default humane
