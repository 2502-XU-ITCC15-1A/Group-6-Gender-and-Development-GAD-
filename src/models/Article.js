import mongoose from 'mongoose';

const ArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    excerpt: { type: String },
    imageUrl: { type: String },
    seminar: { type: mongoose.Schema.Types.ObjectId, ref: 'Seminar' },
    published: { type: Boolean, default: true },
    publishedAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ArticleSchema.pre('save', function preSave(next) {
  if (!this.excerpt) {
    const plain = String(this.content || '').replace(/\s+/g, ' ').trim();
    this.excerpt = plain.slice(0, 180) + (plain.length > 180 ? '…' : '');
  }
  next();
});

export default mongoose.model('Article', ArticleSchema);

