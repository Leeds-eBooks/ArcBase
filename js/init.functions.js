function formatISBN(str) {
  return str.insert(3,'-').insert(11,'-').insert(14,'-');
}

function preventAuthorEditing(i) {
  var bookRows = Array.from(document.querySelectorAll('tr.book-rows')),
      authors = Array.from(bookRows[i].querySelectorAll('td.authors > div .author-button'));
  authors.forEach(a => {a.readOnly = true;});
}

function clearInputs() {
  model.inputs={
    title: '',
    authors: [{
      name:'',
      roles: {
        author: false,
        translator: false,
        editor: false,
        introducer: false,
        critic: false
      }
    }],
    pubdate: '',
    pages: '',
    shortdesc: '',
    ISBNs: {
      pbk: '',
      hbk: '',
      ebk: ''
    },
    price: {
      pbk: '',
      hbk: '',
      ebk: ''
    },
    button: 'Save'
  };
}

function choosy(message, options, urls) {
  return new Promise(function(resolve, reject) {
    const hasUrls = (urls && urls.length);
    const frag = document.createDocumentFragment();
    const overlay = document.createElement('div');
    const dialog = document.createElement('div');
    const p = document.createElement('p');
    const inputs = options.map((option, i) => {
      const button = hasUrls ?
        document.createElement('a') : document.createElement('button');
      button.textContent = option;
      if (hasUrls) {
        button.href = urls[i];
        button.target = "_blank";
      }
      return button;
    });

    function dismiss() {
      document.body.removeChild(overlay);
    }

    overlay.className = 'dialog-overlay';

    p.innerHTML = message;
    dialog.appendChild(p);
    inputs.forEach(input => {dialog.appendChild(input);});

    overlay.appendChild(dialog);
    frag.appendChild(overlay);
    document.body.appendChild(frag);

    overlay.addEventListener('click', event => {
      if (event.target === event.currentTarget) {
        dismiss();
        resolve(false);
      }
    });
    if (!hasUrls) {
      inputs.forEach((input, i) => {
        input.addEventListener('click', event => {
          dismiss();
          resolve(options[i]);
        });
      });
    }
  });
}

function chooseCover(parseBook) {
  return function(event, scope) {
    const sizes = ['200', '600', 'full size'];
    choosy(
      'Choose cover size (width in pixels)<br><br>' +
        '<strong>Right-click and choose "Save&nbsp;link&nbsp;as..." to download</strong>',
      sizes,
      sizes.map(size => {
        const key = (size === 'full size') ?
          'cover_orig' : 'cover_' + size;
        return parseBook.get(key).url();
      })
    ).catch(console.log);
  };
}

function authorMapper(author) {
  var obj=this;
  if (author && author.get) {
    return {
      name: author.get('name'),
      roles: (obj.get('roleMap') && obj.get('roleMap').find(v => v.id===author.id).roles) || {}
    };
  } else {
    return {
      name: "",
      roles: {}
    };
  }
}

function update(newBook, load150more) {
  var query = new Parse.Query(Book),
      amountToSkip = load150more ? model.books.length : 0;

  function whenLoaded(results) {
    results.forEach(pb => { // pb = parseBook
      const existingBook = model.books.find(book => book.id === pb.id),
            bookObj = {
              id: pb.id,
              title: pb.get('title'),
              coverimg: pb.has('cover_200') ? pb.get('cover_200').url() : '',
              authors: (pb.get('authors') && pb.get('authors').map(authorMapper,pb)) || [],
              pubdate: pb.get('pubdate'),
              pages: pb.get('pages'),
              shortdesc: pb.get('shortdesc'),
              ISBNs: pb.get('ISBNs') && pb.get('ISBNs').reduce((obj, current) => {
                obj[current.type]=current.value;
                return obj;
              }, {}),
              price: (pb.get('price') && pb.get('price').reduce((obj, current) => {
                obj[current.type] = current.value;
                return obj;
              }, {})) || {pbk:'', hbk:'', ebk:''},
              button: 'Edit',
              chooseCover: chooseCover(pb)
            };
      var modelBook;

      if (pb.has('authors')) {
        pb.get('authors').forEach(parseAuthor => {
          if (!model.authors.some(a => a.get('name') === parseAuthor.get('name'))) {
            model.authors.push(parseAuthor);
          }
        });
      }

      if (existingBook) modelBook = Object.assign(existingBook, bookObj);
      else {
        modelBook = Object.assign(bookObj, {
          addAuthor(event,scope) {
            scope.book.authors.push({
              name:'',
              roles: {
                author: false,
                translator: false,
                editor: false,
                introducer: false,
                critic: false
              }
            });
          },
          isEditing() {
            return this.button==='Save';
          }
        });
        model.books[results.length > 1 ? 'push' : 'unshift'](modelBook);
      }

      parseBookMap.set(modelBook, pb);
    });

    if (newBook) clearInputs();
  }

  if (newBook) query.equalTo('objectId', newBook.id);

  query
  .descending('pubdate')
  .skip(amountToSkip)
  .limit(150)
  .include('authors')
  .find()
  .then(whenLoaded)
  .fail(err => {
    console.log(JSON.stringify(err));
  });
}

function saveToParse(data, bookToEdit) {
  var query=new Parse.Query(Book),
      book=bookToEdit ?
        query.get(bookToEdit.id) :
        new Book();

  function save(book) {
    book.save(data, {
      success: update, // update(newBook)
      error: function(book, error) {
        console.error(JSON.stringify(error));
        if (error.code == 141) {
          humane.error('The upload failed! Please try again.');
          update(book);
        }
      }
    });
  }

  if (bookToEdit) {
    book.then(save);
  } else {
    save(book);
  }
}

function getParseAuthors(authorsArray) {
  return new Promise(function(resolve, reject) {
    var query=new Parse.Query(Author);
    query.containedIn('name', authorsArray);
    query.find({
      success(savedAuthors) {
        const savedAuthorNames = savedAuthors.map(v => v.get('name'));

        if (savedAuthorNames.length !== authorsArray.length) {
          const promisedAuthors = authorsArray.map(name => {
            if (!savedAuthorNames.includes(name)) {
              const newAuthor = new Author();
              return newAuthor.save({name});
            } else return savedAuthors.find(savedAuthor =>
              savedAuthor.get('name') === name);
          });
          Promise.all(promisedAuthors).then(resolve);
        } else resolve(savedAuthors);
      },
      error: reject
    });
  });
}
