import Features from './_componentsHome/Features/Features';
import Header from './_componentsHome/Header/Header';
import Hero from './_componentsHome/Hero/Hero';
import Footer from './_componentsHome/Footer/Footer';
import Metrics from './_componentsHome/Metrics/Metrics';
export default function Home() {
  return <><a className="skip-link" href="#main-content">Saltar al contenido</a><Header /><main id="main-content" tabIndex={-1}><Hero /><Features /><Metrics /></main><Footer /></>;
}
