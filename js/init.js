Parse.initialize(ArcBase.keys.Parse.a,ArcBase.keys.Parse.b);
var table=document.querySelector('#main table'),
    Book=Parse.Object.extend("Book"),
    Author=Parse.Object.extend("Author"),
    model;

function update(newBook) {
  var query=new Parse.Query(Book);
  if (newBook) {query.equalTo('objectId',newBook.id);}
  query.include('authors').find().then(function(results) {
    results.forEach(v => {
      model.books.push({
        title: v.get('title'),
        authors: v.get('authors') && v.get('authors').map(v => v.get('name')).join('<br>'),
        ISBNs: v.get('ISBNs') && v.get('ISBNs').map(v => `${v.type}: ${v.value}`).join('<br>')
      });
    });
  }).fail(function(err) {
    console.log(JSON.stringify(err));
  });
}

function saveToParse(data, authorRelations) {
  var book=new Book();

  // book.set(data);
  // book.relation('authors').add(authorRelations); // FIXME change to array of pointers instead of relation?
  // book.save(null, {
  book.save(data, {
    success: update,
    error: function(book, error) {
      console.error(JSON.stringify(error));
    }
  });
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
  books: [],
  inputs: {
    title: '',
    authors: '',
    ISBNs: {
      pbk: '',
      hbk: '',
      ebk: ''
    }
  },
  submit() {
    var data={},
        // inputs=document.querySelectorAll('#inputs input'),
        tempInput,tempKey,authors=[];

    function addToAuthors(v) {authors.push(v.trim());}

    for (var key in model.inputs) {
      tempInput=model.inputs[key];
      tempKey=key;

      if (tempKey==='authors') {
        tempInput.split(';').forEach(addToAuthors);
      } else if (tempKey==='ISBNs') {
        data.ISBNs=Object.keys(tempInput).map(v => {
          return {type:v,value:tempInput[v].replace(/\D+/g,'')};
        });
      } else {
        data[tempKey]=tempInput;
      }
    }
    getParseAuthors(authors).then(function(returnedAuthors) {
      data.authors=returnedAuthors;
      saveToParse(data, returnedAuthors);
    });
  }
};

rivets.bind(document.body, model);
update();
