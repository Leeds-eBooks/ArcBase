/**
  * Promisified CSS transition events
  * @param  {HTMLElement} el        The element to watch
  * @param  {String}      action    The `classList` method: "add", "remove" or "toggle"
  * @param  {String}      className The className to be added/removed
  * @return {Promise}               Resolves on `transitionend` event
  */
export const trans = (el, action, className) =>
  new Promise(resolve => {
    const eventStr = el.style.transition ? 'transitionend' : 'webkitTransitionEnd'
    function end() {
      el.removeEventListener(eventStr, end)
      resolve(el)
    }
    el.addEventListener(eventStr, end)
    el.classList[action](className)
  })
