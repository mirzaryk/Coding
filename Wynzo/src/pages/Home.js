import React from 'react';
import { Link } from 'react-router-dom';
import DrawCard from '../components/DrawCard';
import './Home.css';
import { FaTrophy, FaMoneyBillWave, FaUserPlus, FaTicketAlt, FaTasks, FaArrowRight } from 'react-icons/fa';

function Home() {
  return (
    <div>
      <div className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1>Win Big with Wynzo Lucky Draw</h1>
            <p>Enter our draws for just Rs. 100 and stand a chance to win up to Rs. 100,000 in cash prizes!</p>
            <Link to="/signup" className="hero-btn">
              Sign Up & Start Winning <FaArrowRight />
            </Link>
          </div>
        </div>
        <div className="floating-element float1"></div>
        <div className="floating-element float2"></div>
        <div className="floating-element float3"></div>
      </div>

      <div className="container">
        <section className="active-draw-section">
          <h2 className="section-title">Current Active Draw</h2>
          <p className="section-subtitle">Enter our draw for a chance to win big prizes every 6 hours!</p>
          
          <DrawCard />
        </section>

        <section className="how-it-works">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Join Wynzo in just a few simple steps and start winning amazing cash prizes!</p>
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
                <FaTasks />
              </div>
              <h3>Daily Tasks</h3>
              <p>Complete daily tasks to earn rewards and boost your wallet balance.</p>
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
            <p className="section-subtitle">Each draw has 10 winners with cash prizes worth Rs. 210,000 from a total pool of Rs. 250,000!</p>
            
            <div className="prize-table">
              <div className="prize-row header">
                <div className="prize-cell">Position</div>
                <div className="prize-cell">Prize Amount</div>
              </div>
              <div className="prize-row">
                <div className="prize-cell" data-label="Position">1st Place</div>
                <div className="prize-cell prize-amount" data-label="Prize Amount">Rs. 100,000</div>
              </div>
              <div className="prize-row">
                <div className="prize-cell" data-label="Position">2nd Place</div>
                <div className="prize-cell prize-amount" data-label="Prize Amount">Rs. 50,000</div>
              </div>
              <div className="prize-row">
                <div className="prize-cell" data-label="Position">3rd Place</div>
                <div className="prize-cell prize-amount" data-label="Prize Amount">Rs. 25,000</div>
              </div>
              <div className="prize-row">
                <div className="prize-cell" data-label="Position">4th - 10th Place</div>
                <div className="prize-cell prize-amount" data-label="Prize Amount">Rs. 5,000 each</div>
              </div>
            </div>
            <div className="prize-footnote">
              <p className="section-subtitle">Each draw requires a minimum of 2,500 participants at Rs. 100 per entry, creating a total pool of Rs. 250,000.</p>
            </div>
          </div>
        </section>

        <section className="testimonials-section">
          <h2 className="section-title">Recent Winners</h2>
          <p className="section-subtitle">Join thousands of happy winners who have already claimed their prizes!</p>
          <div className="testimonials-container">
            <div className="testimonial-card">
              <div className="testimonial-avatar">AM</div>
              <h4>Ahmed M.</h4>
              <span className="win-amount">Won Rs. 100,000</span>
              <p className="testimonial-text">"I couldn't believe it when I received the notification! Wynzo has changed my life overnight!"</p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-avatar">SF</div>
              <h4>Sana F.</h4>
              <span className="win-amount">Won Rs. 50,000</span>
              <p className="testimonial-text">"The process was so simple and transparent. I received my prize money directly in my account!"</p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-avatar">RK</div>
              <h4>Rahul K.</h4>
              <span className="win-amount">Won Rs. 25,000</span>
              <p className="testimonial-text">"I've been playing for just a week, and I already won! Can't wait to participate in more draws."</p>
            </div>
          </div>
        </section>
      </div>

      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Try Your Luck?</h2>
          <p>Join thousands of winners today. Enter our draws and you could be next!</p>
          <Link to="/signup" className="cta-btn">
            Start Winning Now <FaArrowRight />
          </Link>
        </div>
        <div className="floating-element float1"></div>
        <div className="floating-element float2"></div>
        <div className="floating-element float3"></div>
      </section>
    </div>
  );
}

export default Home;
