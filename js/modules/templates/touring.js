import blobUtil from 'blob-util'
import {model} from '../../index'
import {
  swapNames,
  cutAtNextFullStop
} from '../util'
import Lazy from 'lazy.js'

async function getImageBase64(_id) {
  return `data:image/jpeg;base64,${
    await Kinvey.File.download(_id)
      .then(res => res._data)
      .then(blob => blobUtil.blobToBase64String(blob))
  }`
}

function getLatestBook({name}) {
  return Lazy(model.books)
    .filter(book => book.authors.find(author => author.name === name))
    .max(book => book.pubdate)
}

const spacing = 20

export default async function(author) {
  const book = getLatestBook(author)

  if (!book.cover_orig) throw new Error('missing cover image')
  if (!author.author_photo._downloadURL) throw new Error('missing author photo')

  else return {
    info: {
      title: swapNames(author)
    },
    content: [
      {
        image: await getImageBase64(author.author_photo._id),
        fit: [400, 250],
        margin: [0, 0, 0, spacing]
      }, {
        text: swapNames(author),
        style: 'h1',
        margin: [0, 0, 0, spacing]
      }, {
        text: cutAtNextFullStop(author.biog, 300),
        margin: [0, 0, 0, spacing]
      }, {
        columns: [
          {
            text: book.shortdesc,
            margin: [0, 50, 0, 0]
          }, {
            image: await getImageBase64(book.cover_orig._id),
            width: 200
          }
        ],
        columnGap: 10,
        margin: [0, 0, 0, spacing]
      }, {
        text: `Publication date: ${(new Date(book.pubdate)).toDateString()}`,
        alignment: 'right'
      }
    ],
    styles: {
      h1: {
        fontSize: 20
      },
      author: {
        fontSize: 12
      }
    },
    pageSize: 'A4'
  }
}
