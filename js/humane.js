import humane from 'humane-js'

Object.assign(humane, {
  success: humane.spawn({
    addnCls: 'humane-flatty-success',
    timeout: 2000
  }),
  info: humane.spawn({
    addnCls: 'humane-flatty-info',
    timeout: 5000,
    clickToClose: true
  }),
  error: humane.spawn({
    addnCls: 'humane-flatty-error',
    timeout: 8000,
    clickToClose: true
  })
})

export default humane
