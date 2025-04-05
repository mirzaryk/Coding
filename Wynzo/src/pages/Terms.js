import React from 'react';
import './Terms.css';

function Terms() {
  return (
    <div className="terms-container">
      <div className="container">
        <h1 className="page-title">Terms & Conditions</h1>
        <p className="page-description">Please read these terms carefully before using Wynzo Lucky Draw</p>
        
        <div className="terms-content">
          <section className="terms-section">
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing or using the Wynzo Lucky Draw platform ("Wynzo"), you agree to be bound by these Terms and Conditions and our Privacy Policy. If you disagree with any part of these terms, you may not access the service.</p>
          </section>
          
          <section className="terms-section">
            <h2>2. Eligibility</h2>
            <p>You must be at least 18 years old and a resident of Pakistan to use Wynzo. By using our service, you represent and warrant that you meet these requirements.</p>
            <p>Employees of Wynzo, their immediate family members, and any persons involved in the development, production, or distribution of Wynzo are not eligible to participate in draws.</p>
          </section>
          
          <section className="terms-section">
            <h2>3. Account Registration</h2>
            <p>To use Wynzo, you must register an account with accurate and complete information. You are responsible for maintaining the security of your account and password. Wynzo cannot and will not be liable for any loss or damage resulting from your failure to comply with this security obligation.</p>
            <p>One individual may maintain only one account. Multiple accounts registered by the same individual may result in all accounts being suspended and any winnings being forfeited.</p>
          </section>
          
          <section className="terms-section">
            <h2>4. Lucky Draw Participation</h2>
            <p>Each draw participation costs Rs. 100. By entering a draw, you acknowledge that your chances of winning depend on the total number of entries and that there is no guarantee of winning.</p>
            <p>Draws are conducted every 6 hours subject to a minimum of 2500 participants. If this threshold is not met, the draw will be extended until the required number of participants is reached.</p>
            <p>All entries are final and non-refundable once purchased.</p>
          </section>
          
          <section className="terms-section">
            <h2>5. Winner Selection & Prize Distribution</h2>
            <p>Winners are selected randomly through an automated system. Each draw has 10 winners with prizes as follows:</p>
            <ul>
              <li>1st Place: Rs. 100,000</li>
              <li>2nd Place: Rs. 50,000</li>
              <li>3rd Place: Rs. 25,000</li>
              <li>4th-10th Place: Rs. 5,000 each</li>
            </ul>
            <p>To ensure fairness, any participant who wins 1st, 2nd, or 3rd place cannot win another top three prize in the same draw.</p>
            <p>Prizes are credited directly to the winner's Wynzo wallet immediately after winner selection.</p>
          </section>
          
          <section className="terms-section">
            <h2>6. Payments & Withdrawals</h2>
            <p>Users can add funds to their Wynzo wallet using JazzCash or Easypaisa. All transactions are processed in Pakistani Rupees (PKR).</p>
            <p>Minimum deposit amount is Rs. 100, and maximum is Rs. 50,000 per transaction.</p>
            <p>Withdrawals can be processed to your registered JazzCash or Easypaisa account. Minimum withdrawal amount is Rs. 500, and maximum is Rs. 50,000 per transaction.</p>
            <p>Withdrawal processing typically takes 24-48 hours but may take longer in certain circumstances.</p>
          </section>
          
          <section className="terms-section">
            <h2>7. Taxes</h2>
            <p>All prizes and winnings may be subject to tax in accordance with Pakistani law. It is the winner's responsibility to report and pay any applicable taxes on their winnings.</p>
            <p>Wynzo may be required to withhold a portion of winnings for tax purposes as required by law.</p>
          </section>
          
          <section className="terms-section">
            <h2>8. Prohibited Activities</h2>
            <p>Users are prohibited from:</p>
            <ul>
              <li>Using the service for any illegal purposes</li>
              <li>Attempting to manipulate draws or outcomes</li>
              <li>Creating multiple accounts</li>
              <li>Using the service to launder money</li>
              <li>Engaging in any activity that disrupts or interferes with the service</li>
              <li>Harassing other users or Wynzo staff</li>
            </ul>
            <p>Violation of these prohibitions may result in account suspension and forfeiture of balances.</p>
          </section>
          
          <section className="terms-section">
            <h2>9. Limitation of Liability</h2>
            <p>Wynzo and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.</p>
            <p>Wynzo's total liability to you for any damages shall not exceed the total amount of fees paid by you to Wynzo in the three months preceding the incident giving rise to the liability.</p>
          </section>
          
          <section className="terms-section">
            <h2>10. Modifications to Terms</h2>
            <p>Wynzo reserves the right to modify these Terms at any time. If we make changes, we will provide notice by posting the updated terms on our website and updating the "Last Updated" date.</p>
            <p>Your continued use of Wynzo after changes to the Terms constitutes your acceptance of the revised Terms.</p>
          </section>
          
          <section className="terms-section">
            <h2>11. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of Pakistan, without regard to its conflict of law provisions.</p>
          </section>
          
          <section className="terms-section">
            <h2>12. Contact Information</h2>
            <p>If you have any questions about these Terms, please contact us at:</p>
            <p>Email: legal@wynzo.com</p>
            <p>Address: Office #123, Tech Plaza, Islamabad, Pakistan</p>
          </section>
          
          <div className="terms-footer">
            <p>Last Updated: June 15, 2023</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Terms;
