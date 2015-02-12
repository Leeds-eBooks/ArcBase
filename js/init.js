Parse.initialize(ArcBase.keys.Parse.a,ArcBase.keys.Parse.b);
var table=document.querySelector('#main table'),
    Book=Parse.Object.extend("Book"),
    Author=Parse.Object.extend("Author"),
    authorOverlay=document.querySelector('.author-overlay'),
    authorModal=document.querySelector('.author-modal'),
    model;

rivets.binders.readonly=function(el, value) {
  el.readOnly=!!value;
};
rivets.formatters.opposite=function(value) {
  return !value;
};

function update(newBook) {
  var query=new Parse.Query(Book);
  if (newBook) {query.equalTo('objectId',newBook.id);}
  query.include('authors').descending('pubdate').find().then(function(results) {
    results.forEach(v => {
      var existingBook=model.books.find(book => book.id===v.id);
      v.get('authors').forEach(author => {model.authors.push(author);});
      if (existingBook) {
        existingBook.id=v.id;
        existingBook.title=v.get('title');
        existingBook.authors=v.get('authors') && v.get('authors').map(v => {return {value:v.get('name')};});
        existingBook.pubdate=v.get('pubdate');
        existingBook.shortdesc=v.get('shortdesc');
        existingBook.ISBNs=v.get('ISBNs') && v.get('ISBNs').reduce((obj, current) => {
          obj[current.type]=current.value;
          return obj;
        }, {});
        existingBook.button='Edit';
      } else {
        model.books.push({
          id: v.id,
          title: v.get('title'),
          authors: v.get('authors') && v.get('authors').map(v => {return {value:v.get('name')};}),
          pubdate: v.get('pubdate'),
          shortdesc: v.get('shortdesc'),
          ISBNs: v.get('ISBNs') && v.get('ISBNs').reduce((obj, current) => {
            obj[current.type]=current.value;
            return obj;
          }, {}),
          /* Methods */
          button: 'Edit',
          addAuthor(event,scope) {
            scope.book.authors.push({value:''});
          },
          isEditing() {
            return this.button==='Submit';
          },
        });
      }
    });
    if (newBook) {
      /* clear inputs */
      model.inputs={
        title: '',
        authors: [{value:''}],
        pubdate: '',
        shortdesc: '',
        ISBNs: {
          pbk: '',
          hbk: '',
          ebk: ''
        }
      };
    }
  }).fail(function(err) {
    console.log(JSON.stringify(err));
  });
}

function saveToParse(data, authorRelations, bookToEdit) {
  var query=new Parse.Query(Book),
      book=bookToEdit ?
        query.get(bookToEdit.id) :
        new Book();

  function save(book) {
    book.save(data, {
      success: update,
      error: function(book, error) {
        console.error(JSON.stringify(error));
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
    query.containedIn('name',authorsArray);
    query.find({
      success: function(res) {
        var savedAuthorNames=res.map(v => v.get('name')),
            promisedAuthors;
        if (savedAuthorNames.length!==authorsArray.length) {
          promisedAuthors=authorsArray.map(v => {
            if (!~savedAuthorNames.indexOf(v)) {
              let newAuthor=new Author();
              return newAuthor.save({name: v});
            } else {
              return res.find(w => w.get('name')===v);
            }
          });
          Promise.all(promisedAuthors).then(resolve);
        } else {
          resolve(res);
        }
      }, error: reject
    });
  });
}

model={
  authors: [],
  books: [],
  inputs: {
    title: '',
    authors: [{value:''}],
    pubdate: '',
    shortdesc: '',
    ISBNs: {
      pbk: '',
      hbk: '',
      ebk: ''
    }
  },
  selectAll() {
    if (this.readOnly) {this.select();}
  },
  addAuthor() {
    model.inputs.authors.push({value:''});
  },
  currentAuthor: {
    name: '',
    biog: ''
  },
  getCurrentAuthor(name) {
    return this.authors.find(v => v.get('name')===name);
  },
  showAuthorModal(event, scope) {
    var author=model.getCurrentAuthor(scope.author.value);
    model.currentAuthor.name=author.get('name');
    authorOverlay.classList.add('modal-in');
  },
  closeModal(event) {
    if (this===event.target) {
      authorOverlay.classList.remove('modal-in');
    }
  },
  submit(event, modelArg, bookToEdit) {
    var data={},
        inputModel=bookToEdit||model.inputs,
        tempInput,tempKey,authors=[];

    if (!inputModel.title.trim()) {
      alert('Every book needs a title...');
      return false;
    } else if (inputModel.authors[inputModel.authors.length-1].value.trim() && !inputModel.authors.every(v => ~v.value.indexOf(','))) {
      alert('Author names must be Lastname, Firstname');
      return false;
    } else {
      for (var key in inputModel) {
        tempInput=inputModel[key];
        tempKey=key;

        if (tempKey==='authors') {
          tempInput.forEach(v => {v.value.trim() && authors.push(v.value.trim().replace(/\s{1,}/g,' '));});
        } else if (tempKey==='ISBNs') {
          data.ISBNs=Object.keys(tempInput).map(v => {
            return {type:v,value:tempInput[v].replace(/\D+/g,'')};
          });
        } else {
          if ('function'!==typeof tempInput && tempKey!=='button') {
            data[tempKey]=tempInput && tempInput.trim().replace(/\s{1,}/g,' ');
          }
        }
      }
      getParseAuthors(authors).then(function(returnedAuthors) {
        data.authors=returnedAuthors;
        saveToParse(data, returnedAuthors, bookToEdit);
      });
      return true;
    }
  },
  editOrSubmit(event, scope) {
    if (scope.book.button==='Edit') {
      scope.book.button='Submit';
    } else {
      if (model.submit(null, null, scope.book)) {
        scope.book.button='<img class="loading" src="images/loading.gif">';
      }
    }
  },
};

rivets.bind(document.body, model);
update();
