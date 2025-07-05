"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const app = (0, express_1.default)();
dotenv_1.default.config();
app.use((0, cors_1.default)({
    origin: ['https://frontend-five-ivory.vercel.app', 'http://localhost:5173']
}));
app.use(express_1.default.json());
// Connect to MongoDB 
const PORT = process.env.PORT || 5000;
mongoose_1.default
    .connect(process.env.MONGO_URI)
    .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
})
    .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err);
});
const bookSchema = new mongoose_1.default.Schema({
    title: String,
    author: String,
    genre: String,
    isbn: String,
    description: String,
    copies: Number,
    available: Boolean,
});
const borrowSchema = new mongoose_1.default.Schema({
    bookId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Book' },
    quantity: Number,
    dueDate: Date,
});
const Book = mongoose_1.default.model('Book', bookSchema);
const Borrow = mongoose_1.default.model('Borrow', borrowSchema);
// Add book
app.post('/api/books', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = req.body;
        const book = new Book(Object.assign(Object.assign({}, data), { available: data.copies > 0 }));
        const saved = yield book.save();
        res.status(201).send(saved);
    }
    catch (error) {
        res.status(500).send({ error: 'Failed to add book' });
    }
}));
// Get all books
app.get('/api/books', (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const books = yield Book.find();
        res.send(books);
    }
    catch (error) {
        res.status(500).send({ error: 'Failed to get books' });
    }
}));
// Get single book by ID
app.get('/api/books/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const book = yield Book.findById(req.params.id);
        if (!book)
            return res.status(404).send({ error: 'Book not found' });
        res.send(book);
    }
    catch (error) {
        res.status(500).send({ error: 'Failed to get book' });
    }
}));
// Update book by ID
app.put('/api/books/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const update = Object.assign(Object.assign({}, req.body), { available: req.body.copies > 0 });
        const updatedBook = yield Book.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!updatedBook)
            return res.status(404).send({ error: 'Book not found' });
        res.send(updatedBook);
    }
    catch (error) {
        res.status(500).send({ error: 'Failed to update book' });
    }
}));
// Delete book by ID
app.delete('/api/books/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield Book.findByIdAndDelete(req.params.id);
        res.send({ message: 'Book deleted' });
    }
    catch (error) {
        res.status(500).send({ error: 'Failed to delete book' });
    }
}));
// Borrow book
app.post('/api/borrow', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bookId, quantity, dueDate } = req.body;
        const book = yield Book.findById(bookId);
        if (!book)
            return res.status(404).send({ error: 'Book not found' });
        if (book.copies < quantity) {
            return res.status(400).send({ error: 'Not enough copies available' });
        }
        book.copies -= quantity;
        if (book.copies === 0)
            book.available = false;
        yield book.save();
        const borrow = new Borrow({ bookId, quantity, dueDate });
        const savedBorrow = yield borrow.save();
        res.status(201).send(savedBorrow);
    }
    catch (error) {
        res.status(500).send({ error: 'Failed to borrow book' });
    }
}));
// Borrow summary (aggregate)
app.get('/api/borrow-summary', (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const summary = yield Borrow.aggregate([
            {
                $lookup: {
                    from: 'books',
                    localField: 'bookId',
                    foreignField: '_id',
                    as: 'book',
                },
            },
            { $unwind: '$book' },
            {
                $group: {
                    _id: '$bookId',
                    bookTitle: { $first: '$book.title' },
                    isbn: { $first: '$book.isbn' },
                    totalQuantityBorrowed: { $sum: '$quantity' },
                },
            },
        ]);
        res.send(summary);
    }
    catch (error) {
        res.status(500).send({ error: 'Failed to get borrow summary' });
    }
}));
app.get("/", (req, res) => {
    res.send("Server Running");
});
