Parse.initialize(ArcBase.keys.Parse.a,ArcBase.keys.Parse.b);
var table=document.querySelector('#main table'),
    Book=Parse.Object.extend("Book"),
    Author=Parse.Object.extend("Author"),
    authorOverlay=document.querySelector('.author-overlay'),
    authorModal=document.querySelector('.author-modal'),
    model;

rivets.adapters['#']={};
for (var key in rivets.adapters['.']) {
  rivets.adapters['#'][key]=rivets.adapters['.'][key];
}
rivets.adapters['#'].get=function(obj,keypath) {
  return obj && obj.get(keypath);
};
rivets.adapters['#'].set=function(obj, keypath, value) {
  return obj && obj.set(keypath, value);
};

rivets.binders.readonly=function(el, value) {
  el.readOnly=!!value;
};

rivets.formatters.opposite=function(value) {
  return !value;
};
rivets.formatters.prepend=function(value, string) {
  return string ? string+""+value : value;
};
rivets.formatters.alphaNumeric=function(v) {
  return v.replace(/\W+/g,'-');
};

function authorMapper(author) {
  var obj=this;
  return {
    name: author.get('name'),
    roles: (obj.get('roleMap') && obj.get('roleMap').find(v => v.id===author.id).roles) || {}
  };
}

function update(newBook) {
  var query=new Parse.Query(Book);
  if (newBook) {query.equalTo('objectId',newBook.id);}
  query.include('authors').descending('pubdate').find().then(function(results) {
    results.forEach(v => {
      var existingBook=model.books.find(book => book.id===v.id);
      if (v.has('authors')) {v.get('authors').forEach(author => {model.authors.push(author);});}
      if (existingBook) {
        existingBook.id=v.id;
        existingBook.title=v.get('title');
        existingBook.authors=(v.get('authors') && v.get('authors').map(authorMapper,v)) || [];
        existingBook.pubdate=v.get('pubdate');
        existingBook.shortdesc=v.get('shortdesc');
        existingBook.ISBNs=v.get('ISBNs') && v.get('ISBNs').reduce((obj, current) => {
          obj[current.type]=current.value;
          return obj;
        }, {});
        existingBook.price=(v.get('price') && v.get('price').reduce((obj, current) => {
          obj[current.type]=current.value;
          return obj;
        }, {})) || {pbk:'',hbk:'',ebk:''};
        existingBook.button='Edit';
      } else {
        model.books.push({
          id: v.id,
          title: v.get('title'),
          authors: (v.get('authors') && v.get('authors').map(authorMapper,v)) || [],
          pubdate: v.get('pubdate'),
          shortdesc: v.get('shortdesc'),
          ISBNs: v.get('ISBNs') && v.get('ISBNs').reduce((obj, current) => {
            obj[current.type]=current.value;
            return obj;
          }, {}),
          price: (v.get('price') && v.get('price').reduce((obj, current) => {
            obj[current.type]=current.value;
            return obj;
          }, {})) || {pbk:'',hbk:'',ebk:''},
          /* Methods */
          button: 'Edit',
          addAuthor(event,scope) {
            scope.book.authors.push({
              name:'',
              roles: {
                author: false,
                translator: false,
                editor: false,
                introducer: false
              }
            });
          },
          isEditing() {
            return this.button==='Save';
          },
        });
      }
    });
    if (newBook) {
      /* clear inputs */
      model.inputs={
        title: '',
        authors: [{
          name:'',
          roles: {
            author: false,
            translator: false,
            editor: false,
            introducer: false
          }
        }],
        pubdate: '',
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
  }).fail(function(err) {
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
    authors: [{
      name:'',
      roles: {
        author: false,
        translator: false,
        editor: false,
        introducer: false
      }
    }],
    pubdate: '',
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
  },
  selectAll() {
    if (this.readOnly) {this.select();}
  },
  addAuthor() {
    model.inputs.authors.push({
      name:'',
      roles: {
        author: false,
        translator: false,
        editor: false,
        introducer: false
      }
    });
  },

  submit(event, modelArg, bookToEdit) {
    var data={},
        inputModel=bookToEdit||model.inputs,
        tempInput,tempKey,authors=[];

    if (!inputModel.title.trim()) {
      alert('Every book needs a title...');
      return false;
    } else if (inputModel.authors.some(v => v.name.trim() && !~v.name.indexOf(','))) {
      alert('Author names must be Lastname, Firstname');
      return false;
    } else {
      if (!bookToEdit) {model.inputs.button='<img class="loading" src="images/loading.gif">';}
      for (var key in inputModel) {
        tempInput=inputModel[key];
        tempKey=key;

        if (tempKey==='authors') {
          tempInput.forEach(v => {
            v.name.trim() && authors.push(v.name.trim().replace(/\s{1,}/g,' '));
          });
        } else if (tempKey==='ISBNs') {
          data.ISBNs=Object.keys(tempInput).map(v => {
            return {type:v,value:tempInput[v].replace(/\D+/g,'')};
          });
        } else if (tempKey==='price') {
          data.price=Object.keys(tempInput).map(v => {
            return {type:v,value:tempInput[v]};
          });
        } else {
          if ('function'!==typeof tempInput && tempKey!=='button' && tempKey!=='filterOut') {
            data[tempKey]=tempInput && tempInput.trim().replace(/\s{1,}/g,' ');
          }
        }
      }
      getParseAuthors(authors).then(function(returnedAuthors) {
        data.authors=returnedAuthors;
        data.roleMap=[];
        returnedAuthors.forEach(author => {
          data.roleMap.push({
            id: author.id,
            roles: inputModel.authors.find(v => v.name===author.get('name')).roles
          });
        });
        saveToParse(data, bookToEdit);
      });
      return true;
    }
  },

  editOrSubmit(event, scope) {
    if (scope.book.button==='Edit') {
      scope.book.button='Save';
    } else {
      if (model.submit(null, null, scope.book)) {
        scope.book.button='<img class="loading" src="images/loading.gif">';
      }
    }
  },
  currentAuthor: undefined,
  getCurrentAuthor(name) {
    return this.authors.find(v => v.get('name')===name);
  },
  showAuthorModal(event, scope) {
    if (!scope.book.isEditing()) {
      model.currentAuthor=model.getCurrentAuthor(scope.author.name);
      authorOverlay.classList.add('modal-in');
    }
  },
  closeModal(event) {
    if (this===event.target) {
      model.isEditingAuthor=false;
      model.authorButton='Edit';
      authorOverlay.classList.remove('modal-in');
    }
  },
  isEditingAuthor: false,
  authorButton: 'Edit',
  editAuthor(event) {
    var isEditing=model.authorButton==='Save';
    model.authorButton=isEditing?'<img class="loading" src="images/loading.gif">':'Save';
    model.isEditingAuthor=!isEditing;
    if (isEditing) {
      model.currentAuthor.save().then(res => {
        model.authorButton='Edit';
      }).fail(console.log);
    }
  },
  smartSearch(event, scope) {
    var column=this.getAttribute('data-search-column');
    for (var i=0;i<model.books.length;i++) {
      let book=model.books[i],
          item=book[column];
      if ('string'===typeof item) {
        book.filterOut=!~item.toLowerCase().indexOf(this.value.toLowerCase());
      } else if (column==='authors') {
        book.filterOut=item.every(v => !~v.name.toLowerCase().indexOf(this.value.toLowerCase()));
      } else if (column==='ISBNs' || column==='price') {
        book.filterOut=Object.keys(item).every(k => !~item[k].indexOf(this.value));
      } else if (!item) {
        book.filterOut=true;
      }
    }
    if (this.value) {this.classList.add('warning');}
    else {this.classList.remove('warning');}
  },
  // alertMe() {
  //   console.log(arguments);
  // },
  menu() {
    // var loadFile=function(url,callback){
    //     JSZipUtils.getBinaryContent(url,callback);
    // };
    // loadFile("examples/tagExample.docx", function(err,content) {
    //     if (err) {throw err;}
    //     doc=new Docxgen(content);
    //     doc.setData({
    //       "first_name":"Hipp",
    //       "last_name":"Edgar",
    //       "phone":"0652455478",
    //       "description":"New Website"
    //     }); //set the templateVariables
    //     doc.render(); //apply them (replace all occurences of {first_name} by Hipp, ...)
    //     out=doc.getZip().generate({type:"blob"}); //Output the document using Data-URI
    //     saveAs(out,"output.docx");
    // });
  }
};

rivets.bind(document.body, model);
update();
