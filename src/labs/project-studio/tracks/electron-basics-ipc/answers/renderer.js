window.desk.info().then((info) => {
  document.querySelector('#where').textContent =
    `Electron ${info.electron} on ${info.platform}${info.packaged ? ' (packaged)' : ''}`
})
