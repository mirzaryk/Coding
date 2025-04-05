import React from 'react';
import { Link } from 'react-router-dom';
import DrawCard from '../components/DrawCard';
import './Home.css';
import { FaTrophy, FaMoneyBillWave, FaUserPlus, FaTicketAlt } from 'react-icons/fa';

function Home() {
  return (
    <div>
      <div className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1>Win Big with Wynzo Lucky Draw</h1>
            <p>Enter our draws for just Rs. 100 and stand a chance to win up to Rs. 100,000 in cash prizes!</p>
            <Link to="/signup" className="btn btn-primary hero-btn">
              Sign Up & Start Winning
            </Link>
          </div>
        </div>
      </div>

      <div className="container">
        <section className="active-draw-section">
          <h2 className="section-title">Current Active Draw</h2>
          <p className="section-subtitle">Enter our draw for a chance to win big prizes every 6 hours!</p>
          
          <DrawCard />
        </section>

        <section className="how-it-works">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-container">
            <div className="step-card">
              <div className="step-icon">
                <FaUserPlus />
              </div>
              <h3>Sign Up</h3>
              <p>Create your account and set up your payment details securely.</p>
            </div>

            <div className="step-card">
              <div className="step-icon">
                <FaMoneyBillWave />
              </div>
              <h3>Add Funds</h3>
              <p>Deposit money to your wallet using JazzCash or Easypaisa.</p>
            </div>

            <div className="step-card">
              <div className="step-icon">
                <FaTicketAlt />
              </div>
              <h3>Enter Draws</h3>
              <p>Pay Rs. 100 per entry to participate in our lucky draws. More entries means better chances!</p>
            </div>

            <div className="step-card">
              <div className="step-icon">
                <FaTrophy />
              </div>
              <h3>Win Prizes</h3>
              <p>Winners are selected randomly when a draw reaches 2500 entries, with prizes up to Rs. 100,000!</p>
            </div>
          </div>
        </section>

        <section className="prize-section">
          <div className="prize-info">
            <h2 className="section-title">Prize Information</h2>
            <p>Each draw has 10 winners with cash prizes worth Rs. 210,000 from a total pool of Rs. 250,000!</p>
            
            <div className="prize-table">
              <div className="prize-row header">
                <div className="prize-cell">Position</div>
                <div className="prize-cell">Prize Amount</div>
              </div>
              <div className="prize-row">
                <div className="prize-cell">1st Place</div>
                <div className="prize-cell">Rs. 100,000</div>
              </div>
              <div className="prize-row">
                <div className="prize-cell">2nd Place</div>
                <div className="prize-cell">Rs. 50,000</div>
              </div>
              <div className="prize-row">
                <div className="prize-cell">3rd Place</div>
                <div className="prize-cell">Rs. 25,000</div>
              </div>
              <div className="prize-row">
                <div className="prize-cell">4th - 10th Place</div>
                <div className="prize-cell">Rs. 5,000 each</div>
              </div>
            </div>
            <div className="prize-footnote">
              <p>Each draw requires a minimum of 2,500 participants at Rs. 100 per entry, creating a total pool of Rs. 250,000.</p>
            </div>
          </div>
        </section>

        <section className="testimonials-section">
          <h2 className="section-title">Recent Winners</h2>
          <div className="testimonials-container">
            <div className="testimonial-card">
              <div className="testimonial-avatar">AM</div>
              <h4>Ahmed M.</h4>
              <p className="win-amount">Won Rs. 100,000</p>
              <p>"I couldn't believe it when I received the notification! Wynzo has changed my life overnight!"</p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-avatar">SF</div>
              <h4>Sana F.</h4>
              <p className="win-amount">Won Rs. 50,000</p>
              <p>"The process was so simple and transparent. I received my prize money directly in my account!"</p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-avatar">RK</div>
              <h4>Rahul K.</h4>
              <p className="win-amount">Won Rs. 25,000</p>
              <p>"I've been playing for just a week, and I already won! Can't wait to participate in more draws."</p>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-content">
            <h2>Ready to Try Your Luck?</h2>
            <p>Join thousands of winners today. Enter our draws and you could be next!</p>
            <Link to="/signup" className="btn btn-primary cta-btn">Start Winning Now</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;
