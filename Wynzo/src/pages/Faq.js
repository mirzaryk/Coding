import React, { useState } from 'react';
import './Faq.css';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

function Faq() {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleFaq = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const faqItems = [
    {
      question: "How does the Wynzo Lucky Draw work?",
      answer: "Wynzo is a lucky draw platform where users can enter draws for Rs. 100 per entry. Draws are held when they reach 2500 entries or at admin discretion. Winners are selected randomly and receive cash prizes directly to their Wynzo wallet."
    },
    {
      question: "How much does it cost to enter a draw?",
      answer: "Each entry costs Rs. 100. You can enter multiple times (up to 100 entries at once) to increase your chances of winning, with each entry requiring a separate Rs. 100 fee."
    },
    {
      question: "How often are draws held?",
      answer: "Draws are scheduled to occur every 6 hours, provided that the recommended threshold of 2500 entries is met. If the threshold isn't met, the draw continues until enough entries are received or the administrator decides to complete the draw."
    },
    {
      question: "Can I enter a draw multiple times?",
      answer: "Yes! Each Rs. 100 payment gets you one unique entry with its own ticket ID. You can submit up to 100 entries at once to maximize your chances of winning."
    },
    {
      question: "How are winners selected?",
      answer: "Winners are selected through a completely random and automated system. Each entry generates a unique ticket ID, and the system randomly selects winning tickets from all valid entries."
    },
    {
      question: "What are the prizes?",
      answer: "Each draw has 10 winners with the following prize breakdown: 1st Place: Rs. 100,000, 2nd Place: Rs. 50,000, 3rd Place: Rs. 25,000, and 7 more winners receiving Rs. 5,000 each."
    },
        {
      question: "How do I add funds to my account?",
      answer: "You can add funds to your Wynzo wallet using JazzCash or Easypaisa. Simply go to your Wallet page, select 'Add Funds', enter the amount, and choose your preferred payment method."
    },
    {
      question: "How and when can I withdraw my winnings?",
      answer: "For top 3 winners (places 1-3), winnings are automatically added to your Wynzo wallet. For smaller prizes (places 4-10), you'll need to contact support to claim your prize. You can request a withdrawal at any time by going to your Wallet page and selecting 'Withdraw Funds'. Withdrawals are processed within 24-48 hours to your registered JazzCash or Easypaisa account."
    },
    {
      question: "Is there a minimum or maximum withdrawal amount?",
      answer: "The minimum withdrawal amount is Rs. 500, and the maximum is Rs. 50,000 per transaction. For larger amounts, you may need to make multiple withdrawal requests."
    },
    {
      question: "What happens if a draw doesn't get enough entries?",
      answer: "If a draw doesn't reach the recommended threshold of 2500 entries within the scheduled timeframe, the draw continues until enough entries are received or until the administrator decides to complete the draw. Your entries remain valid until the draw is completed."
    },
    {
      question: "How can I check if I've won?",
      answer: "Winners are notified via email and in-app notifications. You can also check your entries page or the previous draws section to see results and any winnings."
    },
    {
      question: "Is Wynzo legal in Pakistan?",
      answer: "Yes, Wynzo operates as a prize draw platform which is legal in Pakistan. We comply with all relevant regulations and tax requirements."
    },
    {
      question: "Why do I need to claim smaller prizes?",
      answer: "To prevent fraud and ensure fair distribution, prizes for positions 1-10 require manual verification. Contact our support team through the app to claim these prizes."
    }
  ];

  return (
    <div className="faq-container">
      <div className="container">
        <h1 className="page-title">Frequently Asked Questions</h1>
        <p className="page-description">Find answers to common questions about Wynzo Lucky Draw</p>
        
        <div className="faq-content">
          {faqItems.map((item, index) => (
            <div key={index} className="faq-item">
              <div 
                className={`faq-question ${activeIndex === index ? 'active' : ''}`}
                onClick={() => toggleFaq(index)}
              >
                <h3>{item.question}</h3>
                <div className="faq-icon">
                  {activeIndex === index ? <FaChevronUp /> : <FaChevronDown />}
                </div>
              </div>
              
              <div className={`faq-answer ${activeIndex === index ? 'active' : ''}`}>
                <p>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="faq-contact">
          <h2>Still have questions?</h2>
          <p>If you couldn't find the answer to your question, feel free to contact our support team.</p>
          <a href="mailto:support@wynzo.com" className="btn btn-primary">Contact Support</a>
        </div>
      </div>
    </div>
  );
}

export default Faq;
