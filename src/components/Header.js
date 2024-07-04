// components/Header.js
const Header = () => {
  return (
    <header className="bg-primaryDark text-white p-4 fixed w-full top-0 z-50">
      <div className="container mx-auto ml-4">
        <a href="/">
          <img src="/logo.png" alt="Believe in Serverless Logo"  width={125}/>
        </a>
      </div>
    </header>
  );
};

export default Header;
