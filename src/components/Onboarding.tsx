
const Onboarding = () => {
  return (
    <div id="onboarding-section" className="w-full py-12 sm:py-16 md:py-24 bg-gradient-to-b from-gray-900 to-black px-4 sm:px-6">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 sm:mb-8 text-white">
          Onboarding Across the UK
        </h2>
        <div className="text-gray-300 text-sm sm:text-base md:text-lg mb-8">
          <p className="mb-4">
            We're currently working with selected agents and housing providers across the UK. 
            Beta onboarding is limited — if you manage rental properties and want to test 
            lintels.in, we'd love to hear from you.
          </p>
        </div>
        <a 
          href="mailto:contact@lintels.in"
          className="inline-flex items-center justify-center px-8 py-4 text-lg rounded-full font-medium transition-colors duration-200 bg-gray-700 hover:bg-gray-600 text-white"
        >
          Contact Us
        </a>
      </div>
    </div>
  );
};

export default Onboarding;
