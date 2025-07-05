
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const app = express();

dotenv.config();

app.use(cors({
  origin:['https://frontend-five-ivory.vercel.app','http://localhost:5173']
}));
app.use(express.json());



// Connect to MongoDB 
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err);
  });






const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  genre: String,
  isbn: String,
  description: String,
  copies: Number,
  available: Boolean,
});

const borrowSchema = new mongoose.Schema({
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
  quantity: Number,
  dueDate: Date,
});

const Book = mongoose.model('Book', bookSchema);
const Borrow = mongoose.model('Borrow', borrowSchema);








// Add book
app.post('/api/books', async (req, res) => {
  try {
    const data = req.body;
    const book = new Book({ ...data, available: data.copies > 0 });
    const saved = await book.save();
    res.status(201).send(saved);
  } catch (error) {
    res.status(500).send({ error: 'Failed to add book' });
  }
});

// Get all books
app.get('/api/books', async (_, res) => {
  try {
    const books = await Book.find();
    res.send(books);
  } catch (error) {
    res.status(500).send({ error: 'Failed to get books' });
  }
});

// Get single book by ID
app.get('/api/books/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).send({ error: 'Book not found' });
    res.send(book);
  } catch (error) {
    res.status(500).send({ error: 'Failed to get book' });
  }
});

// Update book by ID
app.put('/api/books/:id', async (req, res) => {
  try {
    const update = { ...req.body, available: req.body.copies > 0 };
    const updatedBook = await Book.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updatedBook) return res.status(404).send({ error: 'Book not found' });
    res.send(updatedBook);
  } catch (error) {
    res.status(500).send({ error: 'Failed to update book' });
  }
});

// Delete book by ID
app.delete('/api/books/:id', async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.send({ message: 'Book deleted' });
  } catch (error) {
    res.status(500).send({ error: 'Failed to delete book' });
  }
});



// Borrow book
app.post('/api/borrow', async (req, res) => {
  try {
    const { bookId, quantity, dueDate } = req.body;

    const book = await Book.findById(bookId) as {
      copies: number;
      available: boolean;
      save: () => Promise<void>;
      _id: string;
    };

    if (!book) return res.status(404).send({ error: 'Book not found' });

    if (book.copies < quantity) {
      return res.status(400).send({ error: 'Not enough copies available' });
    }

    book.copies -= quantity;
    if (book.copies === 0) book.available = false;
    await book.save();

    const borrow = new Borrow({ bookId, quantity, dueDate });
    const savedBorrow = await borrow.save();

    res.status(201).send(savedBorrow);
  } catch (error) {
    res.status(500).send({ error: 'Failed to borrow book' });
  }
});






// Borrow summary (aggregate)
app.get('/api/borrow-summary', async (_, res) => {
  try {
    const summary = await Borrow.aggregate([
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
  } catch (error) {
    res.status(500).send({ error: 'Failed to get borrow summary' });
  }
});



app.get("/",(req,res)=>{
  res.send("Server Running")
})

