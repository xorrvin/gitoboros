import WelcomePage from "./WelcomePage";
import FormPage from "./FormPage";
import FinalPage from "./FinalPage";

enum PageTypes {
    Welcome = 0,
    Form,
    Final,
};

const AllPages = [WelcomePage, FormPage, FinalPage];
const AllPagesTypes = [PageTypes.Welcome, PageTypes.Form, PageTypes.Final];

export { PageTypes, AllPages, AllPagesTypes };
