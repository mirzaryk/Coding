import React from 'react';
import { Container } from 'react-bootstrap';
import './StaticPages.css';

function Privacy() {
  return (
    <Container className="static-page privacy-policy">
      <h1>Privacy Policy</h1>
      <div className="effective-date">Effective Date: June 1, 2023</div>
      
      <section className="policy-section">
        <h2>1. Introduction</h2>
        <p>
          Welcome to Wynzo. We respect your privacy and are committed to protecting your personal data. 
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information when 
          you use our service.
        </p>
        <p>
          Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, 
          please do not access the application.
        </p>
      </section>
      
      <section className="policy-section">
        <h2>2. Information We Collect</h2>
        
        <h3>2.1 Personal Information</h3>
        <p>We may collect personally identifiable information, such as:</p>
        <ul>
          <li>Name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>Payment information</li>
          <li>Mobile wallet details (JazzCash, Easypaisa)</li>
        </ul>
        
        <h3>2.2 Non-Personal Information</h3>
        <p>We may also collect non-personal information, such as:</p>
        <ul>
          <li>Browser type</li>
          <li>Device type</li>
          <li>Operating system</li>
          <li>Usage patterns within the application</li>
          <li>IP address</li>
        </ul>
      </section>
      
      <section className="policy-section">
        <h2>3. How We Use Your Information</h2>
        <p>We may use the information we collect for various purposes, including to:</p>
        <ul>
          <li>Provide, operate, and maintain our services</li>
          <li>Process and complete transactions</li>
          <li>Send transactional messages related to your account and activities</li>
          <li>Send administrative information</li>
          <li>Respond to inquiries and offer support</li>
          <li>Improve, personalize, and expand our services</li>
          <li>Develop new products, services, features, and functionality</li>
          <li>Prevent fraudulent transactions, monitor against theft, and protect against criminal activity</li>
        </ul>
      </section>
      
      <section className="policy-section">
        <h2>4. How We Share Your Information</h2>
        <p>We may share information we have collected in certain situations:</p>
        
        <h3>4.1 With Your Consent</h3>
        <p>We may share your information with third parties if you have given us consent to do so.</p>
        
        <h3>4.2 For Legal Compliance</h3>
        <p>
          We may disclose your information where required to do so by law or when we 
          believe that disclosure is necessary to protect our rights or comply with a 
          judicial proceeding, court order, or legal process.
        </p>
        
        <h3>4.3 With Service Providers</h3>
        <p>
          We may share your information with third-party vendors, service providers, 
          contractors, or agents who perform services for us and need access to such 
          information to perform their work.
        </p>
      </section>
      
      <section className="policy-section">
        <h2>5. Security of Your Information</h2>
        <p>
          We use administrative, technical, and physical security measures to protect 
          your personal information. While we have taken reasonable steps to secure the 
          personal information you provide to us, please be aware that no security 
          measures are perfect or impenetrable, and no method of data transmission can 
          be guaranteed against interception.
        </p>
      </section>
      
      <section className="policy-section">
        <h2>6. Your Rights</h2>
        <p>You have certain rights regarding your personal data, including:</p>
        <ul>
          <li>The right to access the personal information we have about you</li>
          <li>The right to request that we correct any inaccurate personal information</li>
          <li>The right to request that we delete your personal information</li>
          <li>The right to opt out of marketing communications</li>
        </ul>
      </section>
      
      <section className="policy-section">
        <h2>7. Children's Privacy</h2>
        <p>
          Our service is not intended for use by children under the age of 18. We do not 
          knowingly collect personal information from children under 18. If you become 
          aware that a child has provided us with personal information, please contact us.
        </p>
      </section>
      
      <section className="policy-section">
        <h2>8. Changes to This Privacy Policy</h2>
        <p>
          We may update our Privacy Policy from time to time. We will notify you of any 
          changes by posting the new Privacy Policy on this page and updating the 
          "Effective Date" at the top of this page. You are advised to review this 
          Privacy Policy periodically for any changes.
        </p>
      </section>
      
      <section className="policy-section">
        <h2>9. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at:
        </p>
        <div className="contact-info">
          <p>Email: privacy@wynzo.com</p>
          <p>Phone: +92 123 456 7890</p>
        </div>
      </section>
    </Container>
  );
}

export default Privacy;
