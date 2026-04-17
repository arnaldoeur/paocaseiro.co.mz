import React from 'react';
import { Star, Quote } from 'lucide-react';

interface TestimonialCardProps {
  name: string;
  role: string;
  content: string;
  avatar: string;
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({ name, role, content, avatar }) => {
  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 relative group transition-all hover:-translate-y-2">
      <Quote className="absolute top-6 right-8 w-12 h-12 text-[#d9a65a]/10 group-hover:text-[#d9a65a]/20 transition-colors" />
      <div className="flex gap-1 mb-6">
        {[1, 2, 3, 4, 5].map((_, i) => (
          <Star key={i} className="w-4 h-4 text-[#d9a65a] fill-[#d9a65a]" />
        ))}
      </div>
      <p className="text-gray-600 italic leading-relaxed mb-8">"{content}"</p>
      <div className="flex items-center gap-4">
        <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all border-2 border-[#d9a65a]/20" />
        <div>
          <h4 className="font-serif font-bold text-[#3b2f2f]">{name}</h4>
          <p className="text-xs text-[#d9a65a] font-bold uppercase tracking-wider">{role}</p>
        </div>
      </div>
    </div>
  );
}; 
