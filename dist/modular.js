"use strict"
// Jonas Karg 2018

// 
// Core
const _modularCore = {
    hideContent: () => {
        document.documentElement.style.display = "none";
    },

    showContent: () => {
        document.documentElement.style.display = "block";
    },

    toHtml: (str, props) => {
        if (typeof str === "function") {
            str = str(props);
        }

        if (typeof str === "string") {
            _modularCore.wrapper.innerHTML = str;
            return _modularCore.wrapper.firstChild;
        } else {
            return str;
        }
    },

    elemAttrToObj: (elem) => {
        let obj = {};
        for (let x = 0; x < elem.attributes.length; x++) {
            obj[elem.attributes[x].name] = elem.attributes[x].value;
        }
        return obj;
    },

    err: (msg, pos) => {
        if (pos) {
            console.error(`( Modular ) ERROR: ${msg} @ ${pos}`);
        } else {
            console.error(`( Modular ) ERROR: ${msg}`);
        }
        return false;
    },

    parse: (context) => {
        const text = context.toString().split("{{");
        let result = text.shift();

        for (const part of text) {
            let [key, rest, overflow] = part.split("}}");
            if (!key || rest == undefined || overflow) {
                return _modularCore.err(`Insert-Delimiters "{{" and "}}" do not match.`);
            }

            key = key.trim();
            key = eval(key);
            key = _modularCore.parse(key);
            result += (key + rest);
        }

        return result;
    },

    wrapper: document.createElement("div"),
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
// Hide Element
Element.prototype.hide = function () {
    this.style.display = "none";
};

// 
// Show Element
Element.prototype.show = function () {
    this.style.display = "block";
};

String.prototype.toHtml = function () {
    _modularCore.wrapper.innerHTML = this;
    return _modularCore.wrapper.firstChild;
}

// 
// Hide all content
_modularCore.hideContent();
_modularCore.wrapper.hide();

// 
// OnLoad event
window.addEventListener("load", () => {
    document.documentElement.innerHTML = _modularCore.parse(document.documentElement.innerHTML);
    _modularCore.showContent();
});

// 
// Select a dom element
function select() {
    let result = [];
    for (let arg of arguments) {
        let element = document.querySelector(arg);
        window[arg.substring(1)] = element;
        result.push(element);
    }
    return result;
}

// 
// Create a component
function create(conf) {
    if (typeof conf === "object") {
        if (conf.render && conf.name) {
            let component;
            component = _modularCore.toHtml(conf.render, conf.props);
            component.css(conf.css);
            component.name = conf.name;
            if (conf.hide) {
                component.hide();
            } else {
                component.show();
            }
            component.conf = conf;
            return component;
        } else {
            return _modularCore.err(`Missing attribute(s)`, "create()");
        }
    } else {
        return _modularCore.err("Invalid input", "create()");
    }
}

function render(components) {
    for (let component of components) {
        let instances = document.getElementsByTagName(component.name);

        for (let i = instances.length - 1; i >= 0; i--) {
            let renderedComp = _modularCore.toHtml(component.conf.render, Object.assign(_modularCore.elemAttrToObj(instances[i]), component.conf.props));
            renderedComp.css(component.conf.css);
            instances[i].outerHTML = renderedComp.outerHTML;
        }
    }
}