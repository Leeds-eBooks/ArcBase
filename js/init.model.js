model={
  authors: [],
  // parseBooks: [],
  books: [],
  inputs: {
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
        introducer: false,
        critic: false
      }
    });
  },
  load150more() {
    update(false, true);
  },

  submit(event, modelArg, bookToEdit) {
    var data = {},
        authors = [],
        replacedAuthorMap = {},
        inputModel = bookToEdit || model.inputs,
        coverFile;

    function continueSubmit(replacedAuthors) {
      if (!bookToEdit) model.inputs.button='<img class="loading" src="images/loading.gif">';

      for (let key in inputModel) {
        let tempInput = inputModel[key],
            tempKey = key;

        if (tempKey==='authors') {
          tempInput.forEach(v => {
            const replacement = replacedAuthors && replacedAuthors.find(
              replacedAuthor => replacedAuthor[0].submitted.name === v.name
            );
            if (replacement) {
              let newName = replacement[0].author.get("name");
              replacedAuthorMap[newName] = v;
              authors.push(newName);
            } else {
              if (v.name.trim()) authors.push(v.name.trim().replace(/\s{1,}/g,' '));
            }
          });
        } else if (tempKey==='ISBNs') {
          data.ISBNs=Object.keys(tempInput).map(v =>
            ({type: v, value: tempInput[v].replace(/\D+/g,'')})
          );
        } else if (tempKey==='price') {
          data.price=Object.keys(tempInput).map(v =>
            ({type:v,value:tempInput[v]})
          );
        } else if (tempKey==='cover_orig') {
          coverFile = new Parse.File(alphaNumeric(inputModel.title, '_') + "_cover.jpg", tempInput);
        } else {
          if (
            'function' !== typeof tempInput &&
            tempKey !== 'button' &&
            tempKey !== 'filterOut' &&
            tempKey !== 'coverimg'
          ) {
            data[tempKey] = tempInput && tempInput.trim().replace(/\s{1,}/g,' ');
          }
        }
      }

      Promise.all([
        getParseAuthors(authors),
        coverFile ? coverFile.save() : Promise.resolve()
      ]).then(([returnedAuthors]) => {
        data.authors = returnedAuthors;
        data.roleMap = [];
        returnedAuthors.forEach(author => {
          const roleModel = inputModel.authors.find(a =>
                  a.name === author.get('name')
                ),
                roles = roleModel ?
                  roleModel.roles :
                  replacedAuthorMap[author.get('name')].roles;
          data.roleMap.push({
            id: author.id,
            roles
          });
        });
        data.cover_orig = coverFile;
        saveToParse(data, bookToEdit);
      }).catch(function(err) {console.error(err.message || err);});
      return true;
    }

    // submit() -->
    if (!inputModel.title.trim()) {
      alert('Every book needs a title...');
      return false;
    } else if (inputModel.authors.some(v => v.name.trim() && !v.name.includes(','))) {
      alert('Author names must be Lastname, Firstname');
      return false;
    } else {

      return Parse.Cloud.run('checkAuthors', {authors: inputModel.authors})
      .then(res => {
        var cancelFlag=false,
            replaced=res.filter(r => {
              if (r.length===1) {
                let name = r[0].author.get("name");
                return confirm('Did you mean '+name+'?\n\nOk for YES, I MEANT "'+name+
                  '"\nCancel for NO, I AM CORRECT');
              } else {
                cancelFlag = confirm("There is an author with a similar name on the database already. If there's a typo, do you want to go back and fix it?\n\nOk for YES, I MADE A MISTAKE\nCancel for NO, I AM CORRECT");
                return cancelFlag;
              }
            });

        if (replaced.length) {
          if (!cancelFlag) continueSubmit(replaced);
        } else continueSubmit();

      }).fail(error => {
        console.log(error);
        continueSubmit();
      });
    }
  },

  editOrSubmit(event, scope) {
    if (scope.book.button === 'Edit') {
      scope.book.button = 'Save';
      preventAuthorEditing(scope.index);
    } else {
      if (model.submit(null, null, scope.book)) {
        scope.book.button = '<img class="loading" src="images/loading.gif">';
        table.querySelectorAll('.book-rows')[scope.index]
          .querySelector('button.cover-upload').textContent = '⇧ cover';
      }
    }
  },

  calculatePrice(event, scope) {
    const mod = scope.book || scope.inputs;
    mod.price.hbk = (parseFloat(this.value) + 3) + "";
    mod.price.ebk = ((Math.ceil(parseFloat(this.value)) / 2) - 0.01) + "";
  },

  calculatePriceFromPages(event, scope) {
    const book = scope.book || scope.inputs,
          pageRange = {
            "000-089": "8.99",
            "090-128": "9.99",
            "129-160": "10.99",
            "161-192": "11.99",
            "193-999": "12.99"
          },
          getRange = pages => {
            const pp = parseInt(pages, 10);
            return Object.keys(pageRange).find(range =>
              pp >= parseInt(range.substr(0, 3), 10) &&
              pp <= parseInt(range.substr(4, 3), 10)
            );
          };
    if (!book.price.pbk || parseFloat(book.price.pbk) < 13) {
      book.price.pbk = book.pages ? pageRange[getRange(book.pages)] : "";
      book.price.hbk = (parseFloat(book.price.pbk) + 3) + "";
      book.price.ebk = ((Math.ceil(parseFloat(book.price.pbk)) / 2) - 0.01) + "";
    }
  },

  validateISBN() {
    if (this.value.length === 13) {
      const ISBNArr = this.value.split('').map(d => parseInt(d, 10));
      let even = 0, odd = 0,
          checkdigit;
      for (let i = 0; i < 6; i++) {
        even += ISBNArr[2 * i];
        odd += ISBNArr[2 * i + 1] * 3;
      }
      checkdigit = (10 - (even + odd) % 10) % 10;
      if (ISBNArr[12] != checkdigit) this.classList.add('invalid');
      else this.classList.remove('invalid');
    } else if (this.value.length>13) this.classList.add('invalid');
    else if (this.value.length<13) this.classList.remove('invalid');
  },

  isEditing: {
    author: false,
    notes: false,
    long: false
  },

  currentAuthor: undefined,
  currentAuthorOldName: undefined,
  getCurrentAuthor(name) {
    return this.authors.find(v => v.get('name') === name);
  },
  showAuthorModal(event, scope) {
    if (this.readOnly) {
      model.currentAuthor = model.getCurrentAuthor(scope.author.name);
      model.currentAuthorOldName = model.currentAuthor.get('name');
      authorOverlay.classList.add('modal-in');
    }
  },
  closeAuthorModal(event) {
    if (this === event.target) {
      model.isEditing.author = false;
      model.authorButton = 'Edit';
      authorOverlay.classList.remove('modal-in');
    }
  },
  calculateCurrentAuthorAge() {
    if (model.currentAuthor && model.currentAuthor.has('dob')) {
      let dob = model.currentAuthor.get('dob'),
          now = new Date();
      return '(Age: ' + Math.floor((now - dob) / 3.15569e10) + ')';
    }
  },

  authorButton: 'Edit',
  addTravelAvailDateRange(event, scope) {
    model.currentAuthor.addUnique('travel_avail_dates', ['','']);
    model.currentAuthor.change();
  },
  delTravelAvailDateRange(event, scope) {
    var range = model.currentAuthor.get('travel_avail_dates')[scope.index];
    model.currentAuthor.remove('travel_avail_dates', range); // FIXME can't remove() after add() without saving in-between
    model.currentAuthor.change();
  },
  editAuthor(event) {
    var isEditing = model.authorButton === 'Save';
    model.authorButton = isEditing ?
      '<img class="loading" src="images/loading.gif">' : 'Save';
    model.isEditing.author =! isEditing;
    if (isEditing) {
      model.currentAuthor.save().then(res => {
        var parseAuthorNewName = res.get('name');
        model.authorButton='Edit';
        model.books.forEach(book => {
          book.authors.filter(a => a.name === model.currentAuthorOldName).forEach(author => {
            author.name = parseAuthorNewName;
          });
        });
      }).fail(console.log);
    }
  },
  removeAuthor(event, scope) {
    var x=scope.book.authors.splice(scope.index, 1);
    // TODO roles
  },

  currentBook: undefined,
  notesButton: 'Edit',
  longButton: 'Edit',
  showModal(which, scope) {
    model.currentBook = parseBookMap.get(scope.book);

    const modalMap = {
      notes: notesOverlay,
      long: longOverlay
    };
    modalMap[which].classList.add('modal-in');
  },
  showNotesModal: (event, scope) => model.showModal('notes', scope),
  showLongModal: (event, scope) => model.showModal('long', scope),
  closeModal(which) {
    const button = `${which}Button`;
    model.isEditing[which] = false;
    model[button] = 'Edit';

    const modalMap = {
      notes: notesOverlay,
      long: longOverlay
    };
    modalMap[which].classList.remove('modal-in');
  },
  closeNotesModal(event) {
    if (this === event.target) return model.closeModal('notes');
  },
  closeLongModal(event) {
    if (this === event.target) return model.closeModal('long');
  },
  editModal(which) {
    const button = `${which}Button`;
    const isEditing = model[button] === 'Save';
    model[button] = isEditing ? '<img class="loading" src="images/loading.gif">' : 'Save';
    model.isEditing[which] = !isEditing;
    if (isEditing) {
      model.currentBook.save().then(res => {
        model[button] = 'Edit';
      }).fail(console.log);
    }
  },
  editNotes: event => model.editModal('notes'),
  editLong: event => model.editModal('long'),

  downloadAI(event, scope) {
    const book = scope.book,
          AI = docTemplates.AI(book),
          blob = new Blob([AI], {type: "text/plain;charset=utf-8"});

    saveAs(blob, `${book.title} AI.txt`);
  },

  downloadPR(event, scope) {
    const book = scope.book,
          PR = docTemplates.PR(book),
          blob = new Blob([PR], {type: "text/plain;charset=utf-8"});

    saveAs(blob, `Press Release Arc Publications - ${book.title}.txt`);
  },

  smartSearch(event, scope) {
    var column = this.getAttribute('data-search-column');
    for (let i = 0, l = model.books.length; i < l; i++) {
      let book = model.books[i],
          item = book[column];
      if ('string' === typeof item) {
        book.filterOut = !item.toLowerCase().includes(this.value.toLowerCase());
      } else if (column === 'authors') {
        book.filterOut = item.every(v => !v.name.toLowerCase().includes(this.value.toLowerCase()));
      } else if (column === 'ISBNs' || column === 'price') {
        book.filterOut = Object.keys(item).every(k => !item[k].includes(this.value));
      } else if (!item) {
        book.filterOut = true;
      }
    }
    if (this.value) this.classList.add('warning');
    else this.classList.remove('warning');
  },
  openFilesCover(event, scope) {
    this.parentNode.querySelector('input[type=file]').click();
  },
  coverSelected(event, scope) {
    const file = this.files[0];
    scope.book.cover_orig = file;
    this.parentNode.querySelector('button').textContent = file.name;
  },

  openContacts(event, scope) {
    const el = document.querySelector('.contacts-overlay');
    el.classList.add('modal-in');
  },
  closeContacts(event, scope) {
    if (this === event.target) {
      const el = document.querySelector('.contacts-overlay');
      el.classList.remove('modal-in');
    }
  },
  foundContacts: [],
  searchContacts: (function() {
    const Contact = Parse.Object.extend("Contact"),
          query = new Parse.Query(Contact);
    var contacts;

    query.find().then(res => {
      contacts = res;
    });

    return function(event, scope) {
      if (!this.value.trim()) {
        model.foundContacts.splice(0, model.foundContacts.length);
        return false;
      }
      for (let i = 0, l = contacts.length; i < l; i++) {
        const contact = contacts[i],
              data = _.values(contact.toJSON()).toString().toLowerCase();

        if (data.includes(this.value.toLowerCase())) {
          if (!model.foundContacts.includes(contact)) model.foundContacts.push(contact);
        } else {
          let i = model.foundContacts.indexOf(contact);
          if (~i) model.foundContacts.splice(i, 1);
        }
      }
    };
  })()
};

rivetsView = rivets.bind(document.body, model);
update();
