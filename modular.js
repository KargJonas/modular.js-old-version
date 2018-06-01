"use strict";
// Jonas Karg 2018

// 
// Core
const modular = {
    // Hiding and unhiding the entire page
    hideContent: () => document.documentElement.style.display = "none",
    showContent: () => document.documentElement.style.display = "block",

    // Convert values render-property content to element
    toHtml: (str, props) => {
        if (typeof str === "function") {
            str = str(props || {});
        }

        if (typeof str === "string") {
            modular.wrapper.innerHTML = str;
            return modular.wrapper.firstChild;

        } else return str;
    },

    // Convert an elements attributes into an object
    elemToObj: elem => {
        let obj = {};

        Array.from(elem.attributes).map(attr => {
            obj[attr.name] = attr.value
        });

        return obj;
    },

    // Throw an error
    err: (msg, pos) => {
        let error = `Modular Error: ${msg}`;
        return (pos ? `${error}\n--> @ ${pos}` : error);
    },

    warn: (msg, pos) => {
        let warning = `Modular Warning/Info: ${msg}`;
        return (pos ? `${warning}\n--> @ ${pos}` : warning);
    },

    // Evalates everything between "{{" and "}}"
    parse: context => {
        const text = context.split("{{");
        let result = text.shift();

        for (const part of text) {
            let [key, rest, overflow] = part.split("}}");

            if (!key || rest == undefined || overflow) {
                throw modular.err(`Insert-Delimiters "{{" and "}}" do not match.`, "parse()");
            }

            key = eval(key.trim());
            key = modular.parse(key);
            result += (key + rest);
        }

        return result;
    },

    time: () => {
        console.warn(modular.warn(`Modular info: ${new Date() - modular.initDate}ms`, "time()"));
    },

    render: (context) => {
        let components = [];

        modular.components.map(comp => {
            if (context.getElementsByTagName(comp.conf.name)[0]) {
                components.push(comp);
            }
        });

        if (components) {
            for (const component of components) {
                let instances = context.getElementsByTagName(component.conf.name);

                for (let i = instances.length - 1; i >= 0; i--) {
                    component.rendered = modular.toHtml(component.conf.render, Object.assign(component.conf.props, modular.elemToObj(instances[i]) || {}));
                    modular.render(component.rendered);
                    component.rendered.css(component.conf.css);
                    instances[i].outerHTML = component.rendered.outerHTML;
                }
            }
        }
    },

    getRouter: () => {
        let router = document.getElementsByTagName("router");
        if (router.length > 1) {
            throw modular.err("More than one router found", "render");

        } else if (router.length === 1) {
            modular.router.exists = true;
            router = router[0];
            modular.router.base = router.getAttribute("base");
            let pages = Array.from(router.getElementsByTagName("page"));
            let redirects = Array.from(router.getElementsByTagName("redirect"));
            let links = Array.from(document.getElementsByTagName("router-link"));

            if (!modular.router.base) {
                modular.router.base = "";
            }

            pages.map(page => {
                let paths = page.getAttribute("path").replace(/\/$/, "").split("||");
                paths.map(path => {
                    modular.router.pages[modular.router.base + path.trim()] = page.innerHTML.trim();
                });
            });

            redirects.map(redirect => {
                let from = redirect.getAttribute("from").replace(/\/$/, "");
                let to = redirect.getAttribute("to").replace(/\/$/, "");
                modular.router.redirects[modular.router.base + from] = modular.router.base + to;
            });


            links.map(link => {
                let to = link.getAttribute("to").replace(/\/$/, "");
                link.setAttribute("onclick", `routerNavigate("${to}")`);
                link.css({
                    color: "#00e",
                    textDecoration: "underline",
                    cursor: "pointer"
                });
            });
        }
    },

    routerEvent: () => {
        if (modular.router.exists) {
            modular.router.route = window.location.pathname.replace(/\/$/, "");

            let redirect = modular.router.redirects[modular.router.route];
            if (redirect) {
                // !! use routerNavigate()
                modular.router.route = redirect;
                window.history.pushState({}, modular.router.route, modular.router.route);
                modular.routerEvent();

            } else {
                modular.router.content = modular.router.pages[modular.router.route];
                if (!modular.router.content) {
                    console.warn(modular.warn("Page not found, using default /404 page.", "routerEvent()"));
                    modular.router.route = modular.router.base + "/404";
                    modular.router.pages[modular.router.base + "/404"] = `<h1>404: Page not Found</h1>`;
                    modular.router.content = modular.router.pages[modular.router.base + "/404"];
                }
            }

            window.history.pushState({}, modular.router.route, modular.router.route);
            render();
        }
    },

    router: {
        exists: false,
        element: undefined,
        route: undefined,
        content: undefined,
        base: undefined,
        pages: {},
        redirects: {}
    },
    components: [],
    wrapper: document.createElement("div"),
    initialDocument: undefined,
    initDate: new Date()
};

// 
// Set CSS
Element.prototype.css = function (css) {
    if (typeof css === "string") {
        this.setAttribute("style", css.replace(/\s+/g, ' ').trim());

    } else if (typeof css === "object") {
        Object.assign(this.style, css);
    }
};

// 
// Instantly executed
modular.hideContent();
modular.initialDocument = document.documentElement.cloneNode(true);
modular.getRouter();

// 
// OnLoad event
window.addEventListener("load", () => {
    modular.routerEvent();
    modular.showContent();
    modular.time();
});

// 
// The module class
class Module {
    constructor(conf) {
        if (typeof conf === "object") {
            if (conf.render && conf.name) {
                this.conf = conf;
                this.conf.props = (this.conf.props ? this.conf.props : {});
                modular.components.push(this);

            } else throw modular.err("Missing inputs", "new Module()");
        } else throw modular.err(`Invalid input\n--> Must be of type "object"`, "new Module()");
    }
}

// 
// Renders the elements passed in with the values of the corresponding tags
// ( in the main html-file or other components )
function render() {
    if (modular.router.exists) {
        document.getElementsByTagName("router")[0].innerHTML = modular.router.content;
    }
    modular.render(document.documentElement);
    document.documentElement.innerHTML = modular.parse(document.documentElement.innerHTML);
}

function routerNavigate(page) {
    modular.router.route = modular.router.base + page;
    window.history.pushState({}, modular.router.route, modular.router.route);
    modular.routerEvent();
}