import mailer from 'nodemailer'

const transporter = mailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'intern.arcpublications@gmail.com',
    pass: 'd17ryden'
  }
})

const mailOptions = {
  from: 'intern.arcpublications@gmail.com',
  to: '',
  subject: 'Catalogue', // Subject line
  text: 'Attached',
  attachments: [{
    filename: 'Catalogue.pdf',
    path: ''
  }]
}

export default function send(email, path) {
  mailOptions.to = email
  mailOptions.attachments[0].path = path

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.error(error)
    else console.log(info.response)
  })
}
