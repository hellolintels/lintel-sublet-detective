
import { ContactForm } from "./contact/ContactForm";

const Contact = () => {
  return (
    <div className="w-full py-12 sm:py-16 md:py-24 bg-black px-4 sm:px-6" id="contact-section">
      <div className="container mx-auto flex flex-col items-center text-center">
        <div className="font-sans w-full max-w-xl flex flex-col items-center mb-6 sm:mb-8 md:mb-10 bg-black p-4 sm:p-6 md:p-8">
          <div className="flex items-center text-[hsl(24,97%,40%)] mb-2">
            <span className="text-base sm:text-lg md:text-xl font-semibold tracking-tight">
              Try lintels.in For Free
            </span>
          </div>
          <p className="text-sm sm:text-base text-white mb-4 font-normal text-center">
            Upload your addresses to receive a free sample report that matches your list to potential sublets
          </p>
          <div className="flex flex-col gap-4 w-full items-center">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
