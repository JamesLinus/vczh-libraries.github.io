
Packages.Define("Doc.View", ["Class", "Doc.SymbolTree", "IO.Resource", "IO.Delay", "XmlHelper", "Html.RazorHelper"], function (__injection__) {
    eval(__injection__);

    /********************************************************************************
    Views
    ********************************************************************************/

    var DocRenderType = Enum(PQN("DocRenderType"), {
        Detailed: 0,
        ClassMember: 1,
        FunctionParameter: 2,
    });

    var DocDocumentType = Enum(PQN("DocDocumentType"), {
        Header: 0,
        Multiline: 1,
        Singleline: 2,
        Embedded: 3,
    });

    var viewType = null;
    var viewTemplate = null;
    var viewSpecification = null;
    var viewTypedef = null;
    var viewVar = null;
    var viewFunction = null;
    var viewEnum = null;
    var viewClass = null;
    var viewGroupedField = null;
    var viewDocument = null;
    var viewTooltip = null;

    function RenderType(type, continuation) {
        var model = { type: type, continuation: continuation };
        return viewType(model);
    }

    function RenderTemplate(template) {
        var model = { template: template };
        return viewTemplate(model);
    }

    function RenderSpecification(template) {
        var model = { template: template };
        return viewSpecification(model);
    }

    function RenderSymbol(renderType, symbol, urlName) {
        if (TemplateDecl.TestType(symbol)) {
            symbol = symbol.Element;
        }
        var model = { renderType: renderType, symbol: symbol, urlName: urlName };

        if (ClassDecl.TestType(symbol)) {
            return viewClass(model);
        }
        else if (VarDecl.TestType(symbol)) {
            return viewVar(model);
        }
        else if (FuncDecl.TestType(symbol)) {
            return viewFunction(model);
        }
        else if (EnumDecl.TestType(symbol)) {
            return viewEnum(model);
        }
        else if (TypedefDecl.TestType(symbol)) {
            return viewTypedef(model);
        }
        else if (GroupedFieldDecl.TestType(symbol)) {
            return viewGroupedField(model);
        }
        else {
            throw new Error("Cannot render symbol of type \"" + symbol.__Type.FullName + "\".");
        }
    }

    function RenderDocument(document, documentType) {
        var model = { document: document, documentType: documentType };
        return viewDocument(model);
    }

    function ShowTooltip(element) {
        HideTooltip();
        var tooltipContent = element.getElementsByClassName("TooltipContent")[0];
        if (!tooltipContent) {
            return;
        }
        var model = { element: element, content: new RazorHtml(tooltipContent.innerHTML) };
        var view = viewTooltip(model);

        var elementRect = element.getBoundingClientRect();
        var bodyRect = document.body.parentElement.getBoundingClientRect();
        var offsetX = elementRect.left - bodyRect.left;
        var offsetY = elementRect.top - bodyRect.top;
        var scrollX = document.body.scrollLeft + document.body.parentElement.scrollLeft;
        var scrollY = document.body.scrollTop + document.body.parentElement.scrollTop;

        var tooltipContentElement = document.createElement("div");
        tooltipContentElement.innerHTML = view.RawHtml;
        tooltipContentElement.addEventListener("mouseleave", function (event) {
            HideTooltip();
        }, false);

        var tooltipElement = document.createElement("div");
        tooltipElement.id = "GACJS_tooltip";
        tooltipElement.classList.add("Tooltip");
        tooltipElement.style.left = (offsetX - scrollX) + "px";
        tooltipElement.style.top = (offsetY - scrollY) + "px";
        tooltipElement.appendChild(tooltipContentElement);

        element.appendChild(tooltipElement);
    }

    function HideTooltip() {
        var tooltipElement = document.getElementById("GACJS_tooltip");
        if (tooltipElement) {
            tooltipElement.parentElement.removeChild(tooltipElement);
        }
    }

    window.UseTooltip = "javascript:Packages.Packages['Doc.View'].ShowTooltip(event.currentTarget);";
    window.DisplayTooltip = "class=\"TooltipContent\"";

    function FindSymbolByOverloadKey(symbol, overloadKey) {
        if (symbol.OverloadKey === overloadKey) {
            return symbol;
        }

        if (TemplateDecl.TestType(symbol)) {
            return FindSymbolByOverloadKey(symbol.Element, overloadKey);
        }

        for (var i = 0; i < symbol.Children.length; i++) {
            var result = FindSymbolByOverloadKey(symbol.Children[i], overloadKey);
            if (result !== null) {
                return result;
            }
        }

        return null;
    }

    function OverloadKeyToUrl(key) {
        var index = key.indexOf("@s:");
        if (index === -1) {
            throw new Error("Cannot parse overload key \"" + key + "\".");
        }
        var symbolKey = key.substring(0, index);
        var urlName = key.substring(index + 3, key.length);
        return "#~/index/" + urlName + "/symbol/" + symbolKey;
    }

    function OverloadKeyToDisplay(key) {
        var index = key.indexOf("@");
        if (index !== -1) {
            key = key.substring(0, index);
        }
        else {
            throw new Error("Cannot parse overload key \"" + key + "\".");
        }

        var index = key.indexOf("(");
        if (index !== -1) {
            key = key.substring(0, index);
        }
        return key.replace(/`\d+/, "<...>");
    }

    /********************************************************************************
    CancelAndRunAfterDocViewReady
    ********************************************************************************/

    var taskSucceeded = null;
    var taskFailed = null;
    var taskReady = false;
    var taskPreparing = false;

    function RunTask(succeeded) {
        if (succeeded) {
            if (taskSucceeded !== null) {
                taskSucceeded();
            }
        }
        else {
            if (taskFailed !== null) {
                taskFailed();
            }
        }

        taskSucceeded = null;
        taskFailed = null;
    }

    function PrepareDocView() {
        if (taskPreparing === false) {
            taskPreparing === true;

            var asyncType = GetResourceAsync("./Doc/View/Type.razor.html", true);
            var asyncTemplate = GetResourceAsync("./Doc/View/Template.razor.html", true);
            var asyncSpecification = GetResourceAsync("./Doc/View/Specification.razor.html", true);
            var asyncTypedef = GetResourceAsync("./Doc/View/Typedef.razor.html", true);
            var asyncVar = GetResourceAsync("./Doc/View/Var.razor.html", true);
            var asyncFunction = GetResourceAsync("./Doc/View/Function.razor.html", true);
            var asyncEnum = GetResourceAsync("./Doc/View/Enum.razor.html", true);
            var asyncClass = GetResourceAsync("./Doc/View/Class.razor.html", true);
            var asyncGroupedField = GetResourceAsync("./Doc/View/GroupedField.razor.html", true);
            var asyncDocument = GetResourceAsync("./Doc/View/Document.razor.html", true);
            var asyncTooltip = GetResourceAsync("./Doc/View/Tooltip.razor.html", true);

            var asyncTasks = [asyncType, asyncTemplate, asyncSpecification, asyncTypedef, asyncVar, asyncFunction, asyncEnum, asyncClass, asyncGroupedField, asyncDocument, asyncTooltip];
            WaitAll(asyncTasks).Then(function (result) {
                for (var i = 0; i < result.length; i++) {
                    if (DelayException.TestType(result[i])) {
                        taskPreparing = false;
                        RunTask(false);
                        return;
                    }
                }

                viewType = result[0].Razor;
                viewTemplate = result[1].Razor;
                viewSpecification = result[2].Razor;
                viewTypedef = result[3].Razor;
                viewVar = result[4].Razor;
                viewFunction = result[5].Razor;
                viewEnum = result[6].Razor;
                viewClass = result[7].Razor;
                viewGroupedField = result[8].Razor;
                viewDocument = result[9].Razor;
                viewTooltip = result[10].Razor;

                taskReady = true;
                taskPreparing = false;
                RunTask(true);
            });
        }
    }

    function CancelAndRunAfterDocViewReady(succeeded, failed) {
        taskSucceeded = succeeded;
        taskFailed = failed;

        if (taskReady) {
            RunTask(true);
        }
        else if (!taskPreparing) {
            PrepareDocView();
        }
    }

    /********************************************************************************
    Package
    ********************************************************************************/

    return {
        DocRenderType: DocRenderType,
        DocDocumentType: DocDocumentType,
        RenderType: RenderType,
        RenderTemplate: RenderTemplate,
        RenderSpecification: RenderSpecification,
        RenderSymbol: RenderSymbol,
        RenderDocument: RenderDocument,
        ShowTooltip: ShowTooltip,
        HideTooltip: HideTooltip,
        FindSymbolByOverloadKey: FindSymbolByOverloadKey,
        OverloadKeyToUrl: OverloadKeyToUrl,
        OverloadKeyToDisplay: OverloadKeyToDisplay,
        CancelAndRunAfterDocViewReady: CancelAndRunAfterDocViewReady,
    }
});