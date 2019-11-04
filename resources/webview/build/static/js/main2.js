(this["webpackJsonpreact-app"]=this["webpackJsonpreact-app"]||[]).push([[0],{352:function(e,t,a){"use strict";a.r(t);a(98),a(99);var n=a(0),r=a.n(n),s=a(33),o=a.n(s);Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));var c=a(9),l=a.n(c),i=a(27),m=a(15),u=a(16),p=a(18),d=a(17),g=a(19),h={postMessage:console.log};try{h=acquireVsCodeApi()}catch(L){}var f={};function v(e){return new Promise((function(t){var a=Math.random();h.postMessage({command:"getLogStreams",messageId:a,payload:{logGroup:e}}),f[a]=function(e){t(e.logStreams)}}))}function y(e){return new Promise((function(t){var a=Math.random();h.postMessage({command:"getLogEvents",messageId:a,payload:{nextToken:e.nextToken,logGroup:e.logGroup,logStream:e.logStream}}),f[a]=function(e){t({nextBackwardToken:e.nextBackwardToken,nextForwardToken:e.nextForwardToken,logEvents:e.logEvents})}}))}window.addEventListener("message",(function(e){var t=e.data;f[t.messageId]&&(f[t.messageId](t.payload),delete f[t.messageId])}));var k=a(358),w=a(34),E=a.n(w),b=a(85),O=a(37),j=a(359),S=a(355),N=a(356),x=function(e){function t(){var e,a;Object(m.a)(this,t);for(var n=arguments.length,r=new Array(n),s=0;s<n;s++)r[s]=arguments[s];return(a=Object(p.a)(this,(e=Object(d.a)(t)).call.apply(e,[this].concat(r)))).state={loaded:!1},a}return Object(g.a)(t,e),Object(u.a)(t,[{key:"componentDidMount",value:function(){var e=this;setTimeout((function(){e.setState({loaded:!0})}),0)}},{key:"renderWithJson",value:function(e){var t=function(e){var t=e.match(/{[\s\S]*}/);if(t)try{var a=JSON.parse(t[0]),n=e.split(t[0]);return[n[0],JSON.stringify(a,null,2),n[1]]}catch(L){return!1}return!1}(e);return t?r.a.createElement("div",{className:"logevent-longmessage"},r.a.createElement("div",null,t[0]),r.a.createElement(j.a,{className:"syntax-highlighter",language:"json",showLineNumbers:!0,lineNumberStyle:{opacity:.4},style:window.slsConsole.darkTheme?S.a:N.a},t[1]),r.a.createElement("div",null,t[2])):r.a.createElement("div",{className:"logevent-longmessage"},e)}},{key:"render",value:function(){return this.state.loaded?this.renderWithJson(this.props.message):r.a.createElement("div",null,"loading")}}]),t}(r.a.Component);var T=function(e){function t(){return Object(m.a)(this,t),Object(p.a)(this,Object(d.a)(t).apply(this,arguments))}return Object(g.a)(t,e),Object(u.a)(t,[{key:"componentDidMount",value:function(){var e=this;setInterval((function(){return e.setState({interval:Date.now()})}),1e4)}},{key:"render",value:function(){return r.a.createElement("span",{className:this.props.className},E()(this.props.time).fromNow())}}]),t}(r.a.Component);function R(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,n)}return a}var P=k.a.Panel,D=function(e){function t(){var e,a;Object(m.a)(this,t);for(var n=arguments.length,r=new Array(n),s=0;s<n;s++)r[s]=arguments[s];return(a=Object(p.a)(this,(e=Object(d.a)(t)).call.apply(e,[this].concat(r)))).state={loaded:!1,messages:[]},a}return Object(g.a)(t,e),Object(u.a)(t,[{key:"componentDidMount",value:function(){var e=Object(i.a)(l.a.mark((function e(){var t,a,n,r;return l.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,y({logGroup:this.props.logGroup,logStream:this.props.logStream});case 2:t=e.sent,a=t.logEvents,n=t.nextBackwardToken,r=t.nextForwardToken,this.setState({loaded:!0,nextBackwardToken:n,nextForwardToken:r,messages:I(a.map((function(e,t){return{timestamp:e.timestamp,messageShort:e.message.slice(0,500),messageLong:e.message}})))});case 7:case"end":return e.stop()}}),e,this)})));return function(){return e.apply(this,arguments)}}()},{key:"onRetryNew",value:function(){var e=Object(i.a)(l.a.mark((function e(){var t,a,n;return l.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return this.setState({loadingNew:!0}),e.next=3,y({logGroup:this.props.logGroup,logStream:this.props.logStream,nextToken:this.state.nextForwardToken});case 3:t=e.sent,a=t.logEvents,n=t.nextForwardToken,this.setState({loadingNew:!1,messages:I([].concat(Object(O.a)(this.state.messages),Object(O.a)(a.map((function(e,t){return{timestamp:e.timestamp,messageShort:e.message.slice(0,500),messageLong:e.message}}))))),nextForwardToken:n});case 7:case"end":return e.stop()}}),e,this)})));return function(){return e.apply(this,arguments)}}()},{key:"onRetryOld",value:function(){var e=Object(i.a)(l.a.mark((function e(){var t,a,n;return l.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return this.setState({loadingOld:!0}),e.next=3,y({logGroup:this.props.logGroup,logStream:this.props.logStream,nextToken:this.state.nextBackwardToken});case 3:t=e.sent,a=t.logEvents,n=t.nextBackwardToken,this.setState({loadingOld:!1,messages:I([].concat(Object(O.a)(a.map((function(e,t){return{timestamp:e.timestamp,messageShort:e.message.slice(0,500),messageLong:e.message}}))),Object(O.a)(this.state.messages))),nextBackwardToken:n});case 7:case"end":return e.stop()}}),e,this)})));return function(){return e.apply(this,arguments)}}()},{key:"render",value:function(){return this.state.loaded?[r.a.createElement("div",{className:"retry-message retry-message-old",key:"retryold"},this.state.loadingOld?"loading older events...":r.a.createElement("span",null,"No older events found at the moment.",r.a.createElement("span",{className:"spanlink retry-link",onClick:this.onRetryOld.bind(this)},"Retry"))),r.a.createElement(k.a,{key:"collapse",bordered:!1},this.state.messages.map((function(e){var t=[];if(e.messageShort.startsWith("REPORT RequestId:")){var a=e.messageShort.match(/Duration: (.*?) ms/),n=e.messageShort.match(/Max Memory Used: (.*?) MB/),s=e.messageShort.match(/Init Duration: (.*?) ms/);s&&t.push("init: ".concat(s[1]," ms")),a&&t.push("".concat(a[1]," ms")),n&&t.push("".concat(n[1]," MB"))}return r.a.createElement(P,{key:e.key,header:r.a.createElement("div",{className:"logevent-header"},r.a.createElement(T,{className:"relative-time",time:e.timestamp}),r.a.createElement("span",{className:"abs-time"},E()(e.timestamp).format("lll")),r.a.createElement("span",{className:"logevent-shortmessage"},t.length?t.map((function(e){return r.a.createElement("span",{className:"event-tag"},e)})):e.messageShort))},r.a.createElement(x,{message:e.messageLong}))}))),r.a.createElement("div",{className:"retry-message retry-message-new",key:"retrynew"},this.state.loadingNew?"loading new events...":r.a.createElement("span",null,"No newer events found at the moment.",r.a.createElement("span",{className:"spanlink retry-link",onClick:this.onRetryNew.bind(this)},"Retry")))]:r.a.createElement("div",{className:"retry-message"},"loading new events...")}}]),t}(r.a.Component);function I(e){return e.map((function(e,t){return function(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?R(a,!0).forEach((function(t){Object(b.a)(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):R(a).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}({},e,{key:"".concat(t,"-").concat(e.timestamp)})}))}var M=k.a.Panel,B=function(e){function t(){var e,a;Object(m.a)(this,t);for(var n=arguments.length,r=new Array(n),s=0;s<n;s++)r[s]=arguments[s];return(a=Object(p.a)(this,(e=Object(d.a)(t)).call.apply(e,[this].concat(r)))).state={refreshInProgress:!1,lastRefreshed:0,logStreams:[],loaded:!1},a}return Object(g.a)(t,e),Object(u.a)(t,[{key:"componentDidMount",value:function(){var e=Object(i.a)(l.a.mark((function e(){var t;return l.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,v("");case 2:t=e.sent,this.setState({loaded:!0,lastRefreshed:Date.now(),logStreams:t});case 4:case"end":return e.stop()}}),e,this)})));return function(){return e.apply(this,arguments)}}()},{key:"onRefresh",value:function(){var e=Object(i.a)(l.a.mark((function e(){var t;return l.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return this.setState({refreshInProgress:!0,lastRefreshed:Date.now()}),e.next=3,v("");case 3:t=e.sent,this.setState({refreshInProgress:!1,logStreams:t});case 5:case"end":return e.stop()}}),e,this)})));return function(){return e.apply(this,arguments)}}()},{key:"render",value:function(){return r.a.createElement("div",{className:"log-section"},r.a.createElement("header",null,r.a.createElement("h2",null,"Logs"),this.state.refreshInProgress?"loading...":r.a.createElement("span",{className:"options"},r.a.createElement("span",{className:"spanlink",onClick:this.onRefresh.bind(this)},"Refresh"),0!==this.state.lastRefreshed&&r.a.createElement("div",{className:"last-refreshed"},"last updated ",r.a.createElement(T,{time:this.state.lastRefreshed})))),this.state.loaded?r.a.createElement(k.a,{className:"logstreamslist"},this.state.logStreams.sort((function(e,t){return t.lastEventTimestamp-e.lastEventTimestamp})).map((function(e){return r.a.createElement(M,{header:r.a.createElement("div",{className:"logstream"},r.a.createElement(T,{className:"relative-time",time:e.lastEventTimestamp}),r.a.createElement("span",{className:"abs-time"},E()(e.lastEventTimestamp).format("lll"))),key:e.arn},r.a.createElement(D,{logGroup:"",logStream:e.logStreamName,onRetry:console.log}))}))):r.a.createElement("div",null,"loading"))}}]),t}(r.a.Component),C=a(357),G=C.a.TabPane;o.a.render(r.a.createElement(C.a,{animated:!1,tabBarExtraContent:r.a.createElement("span",{className:"spanlink",style:{marginRight:10},onClick:console.log},"Add stage")},r.a.createElement(G,{tab:"dev",key:"dev"},r.a.createElement(B,null)),r.a.createElement(G,{tab:"prod",key:"prod"},r.a.createElement(B,null))),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then((function(e){e.unregister()}))},97:function(e,t,a){e.exports=a(352)},99:function(e,t,a){}},[[97,1,2]]]);