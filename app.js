const express = require('express')
const app = express()
const port = 3003
const middleware = require('./middleware')
const path = require('path')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

const database = require('./database')
const session = require('express-session')

const server = app.listen(port, () =>
    console.log('Server listening on port ' + port)
)

const io = require('socket.io')(server, { pingTimeout: 60000 })

app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))

app.use(
    session({
        secret: 'choi ung',
        resave: true,
        saveUninitialized: false,
    })
)

app.set('view engine', 'pug')
app.set('views', 'views')

// Routes
const loginRoute = require('./routes/loginRoute')
const logoutRoute = require('./routes/logoutRoute')
const registerRoute = require('./routes/registerRoute')
const postRoute = require('./routes/postRoute')
const profileRoute = require('./routes/profileRoute')
const uploadRoute = require('./routes/uploadRoute')
const searchRoute = require('./routes/searchRoute')
const messageRoute = require('./routes/messageRoute')
const notificationRoute = require('./routes/notificationRoute')

app.use('/login', loginRoute)
app.use('/logout', logoutRoute)
app.use('/register', registerRoute)
app.use('/post', middleware.requireLogin, postRoute)
app.use('/profile', middleware.requireLogin, profileRoute)
app.use('/uploads', uploadRoute)
app.use('/search', middleware.requireLogin, searchRoute)
app.use('/message', middleware.requireLogin, messageRoute)
app.use('/notification', middleware.requireLogin, notificationRoute)

// Api Routes
const postApiRoute = require('./routes/api/post')
const userApiRoute = require('./routes/api/user')
const chatApiRoute = require('./routes/api/chat')
const messageApiRoute = require('./routes/api/message')
const notificationApiRoute = require('./routes/api/notification')

app.use('/api/post', postApiRoute)
app.use('/api/user', userApiRoute)
app.use('/api/chat', chatApiRoute)
app.use('/api/message', messageApiRoute)
app.use('/api/notification', notificationApiRoute)

app.get('/', middleware.requireLogin, (req, res, next) => {
    const payload = {
        pageTitle: 'Home',
        user: req.session.user,
        userInJS: JSON.stringify(req.session.user),
    }
    res.status(200).render('home', payload)
})

io.on('connection', (socket) => {
    socket.on('setup', (userData) => {
        socket.join(userData._id)
        socket.emit('connected')
    })

    socket.on('join chat', (chatId) => socket.join(chatId))
    socket.on('typing', (chatId) => socket.in(chatId).emit('typing'))
    socket.on('stop typing', (chatId) => socket.in(chatId).emit('stop typing'))
    socket.on('notification received', (userId) =>
        socket.in(userId).emit('notification received')
    )

    socket.on('new message', (message) => {
        const chat = message.chat

        chat.users.forEach((user) => {
            if (user._id === message.sender._id) return
            socket.in(user._id).emit('message recieved', message)
        })
    })
})