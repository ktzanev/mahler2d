var vm = new Vue({
  el: "#app",
  data: {
    aPolygon: [], // the A polygons like [x1,y1,x2,y2,...]
    dPolygon: [], // the D(ual) polygons like [x1,y1,x2,y2,...]
    aSelected: [], // the selection status of A vertices like [true,false,...]
    dSelected: [], // the selection status of D vertices like [true,false,...]
    aIsMaster : true, // decide the master / slave relation between A and D
    graphSize : 7, // the number of visible integer points, used to Zoom in and out
    vertexSize : .05, // the radious of vertices
    edgeWidth : .035, // the width ot the edges
    integerPointSize : .049, // the radious of all integer points
    aPrecision : 4, // the parameter used to round un to 1/aPrecision
    dPrecision : 4, // the parameter used to round un to 1/dPrecision
    // some examples
    examples : [
      { title: "Convex Asymetric 3/2",   aim: true,  data: "(0,1)(1,0)(-1,-1)" },
      { title: "Convex Symetric 2 = B∞", aim: true,  data: "(1,-1)(1,1)(-1,1)(-1,-1)" },
      { title: "Convex Symetric 2 = B1", aim: true,  data: "(1,0)(0,1)(-1,0)(0,-1)" },
      { title: "Pentagone",              aim: true,  data: "(1.0,0.0)(0.309016994375,0.951056516295)(-0.809016994375,0.587785252292)(-0.809016994375,-0.587785252292)(0.309016994375,-0.951056516295)" },
      { title: "Heptagone",              aim: true,  data: "(1.0,0.0)(0.62348980185873359,0.7818314824680298)(-0.22252093395631434,0.97492791218182362)(-0.90096886790241903,0.43388373911755823)(-0.90096886790241915,-0.43388373911755801)(-0.22252093395631459,-0.97492791218182362)(0.62348980185873337,-0.78183148246802991)" },
      { title: "Local min 1",              aim: true,  data: "(2.1164884152430274,-0.9808503160461923)(0.4186726225249168,1.3776969390511773)(-1.5471978996261544,1.8125956552458335)(-1.548325415208969,-0.4233818732506383)(0.5388623575395944,-1.7691976538545588)" }
    ],
    selectedExample : {},
    cID: null, // setInterval ID for Centroid Ping-Pong
    sID: null, // setInterval ID for Santalo Ping-Pong
    useCtrl : navigator.userAgent.indexOf('Mac OS X') == -1 // true if PC, false if Mac
  },// end data
  // ------------------
  watch: {
    aPolygon : {
      handler : function (newA) {
        if (this.aIsMaster) {
          this.dPolygon = dualPolygon(this.aPolygon);
          this.dSelected = Array(this.dPolygon.length/2).fill(false);
        }
      },
      deep : true
    },
    dPolygon : {
      handler : function (newD) {
        if (!this.aIsMaster) {
          this.aPolygon = dualPolygon(newD);
          this.aSelected = Array(this.aPolygon.length/2).fill(false);
        }
      },
      deep : true
    }
  },
  // ===============================================================
  // COMPUTED
  // ===============================================================
  computed: {
    // the polygon A like [{cx,cy,selected}]
    aVertices: function() {
      return vertices(this.aPolygon, this.aSelected);
    },
    // and it's dual D like [x1,y1,x2,y2,...]
    dVertices: function() {
      return vertices(this.dPolygon, this.dSelected);
    },
    // the string replresentation of A like "(x1,y1)(x2,y2)..."
    aString: {
      // getter
      get: function () {
        var str = polygon2string(this.aPolygon);
        if (this.aIsMaster) {
          polystr2localStorage(str,true);
        }
        return str;
      },
      // setter
      set: function (str) {
        this.aPolygon = string2polygon(str);
        this.aSelected = Array(this.aPolygon.length/2).fill(false);
        this.aIsMaster = true;
        polystr2localStorage(str,true);
      }
    },
    // the string replresentation of D like "(x1,y1)(x2,y2)..."
    dString: {
      // getter
      get: function () {
        var str = polygon2string(this.dPolygon);
        if (!this.aIsMaster) {
          polystr2localStorage(str,false);
        }
        return str;
      },
      // setter
      set: function (str) {
        this.dPolygon = string2polygon(str);
        this.dSelected = Array(this.dPolygon.length/2).fill(false);
        this.aIsMaster = false;
        polystr2localStorage(str,false);
      }
    },
    volumeA : function () {
      return volume(this.aPolygon);
    },
    volumeD : function () {
      return volume(this.dPolygon);
    },
    volumeAD : function () {
      return this.volumeA*this.volumeD;
    },
    centroidA : function () {
      var c = centroid(this.aPolygon);
      return { cx:c[0], cy:c[1] };
    },
    centroidD : function () {
      var c = centroid(this.dPolygon);
      return { cx:c[0], cy:c[1] };
    },
    aLines: function () {
      return edgesOfPolygon(this.aPolygon);
    }, // end aLines()
    dLines: function () {
      return edgesOfPolygon(this.dPolygon);
    }, // end dLines
    // second Minkovski for A
    z2A: function(){
      return zxz(this.aPolygon);
    },
    // second Minkovski for D
    z2D: function(){
      return zxz(this.dPolygon);
    },
    // second matrix factor of the Hessian
    factorDA: function(){
      var z2DA = matrixByMatrix(this.z2D,this.z2A);
      return [
        1 - 16*z2DA[0]/this.volumeAD,
        0 - 16*z2DA[1]/this.volumeAD,
        0 - 16*z2DA[2]/this.volumeAD,
        1 - 16*z2DA[3]/this.volumeAD
      ];
    },
    factorAD: function(){
      var z2AD = matrixByMatrix(this.z2A,this.z2D);
      return [
        1 - 16*z2AD[0]/this.volumeAD,
        0 - 16*z2AD[1]/this.volumeAD,
        0 - 16*z2AD[2]/this.volumeAD,
        1 - 16*z2AD[3]/this.volumeAD
      ];
    },
    // the Hessian (that hass sens only at critical points)
    hessianDA: function(){
      return matrixByScalar(-12*this.volumeD,matrixByMatrix(this.z2A,this.factorDA));
    },
    hessianAD: function(){
      return matrixByScalar(-12*this.volumeD,matrixByMatrix(this.z2A,this.factorAD));
    },
    // SVG parameters
    graphPos: function graphPos() {
      var size = this.graphSize;
      var half = size / 2;
      return {
        viewBox: [-half, -half, size, size].join(" "),
        width: size
      };
    },
    netSize: function() {
      return 2*Math.floor(this.visi/2) + 3;
    },
    netOrigin: function() {
      return Math.floor(this.graphSize/2) + 1;
    }
  }, // end computed
  // when the app is starting ...
  created: function () {
    try {
      this.aIsMaster = JSON.parse(localStorage.getItem("aIsMaster", "true"));
      if (this.aIsMaster)
        this.aString = localStorage.getItem("polygoneStr", "(0,1)(1,0)(-1,-1)(-2,-1)");
      else
        this.dString = localStorage.getItem("polygoneStr", "(0,1)(1,0)(-1,-1)(-2,-1)");
    } catch(e) {
      this.aIsMaster = true;
      this.aString = "(0,1)(1,0)(-1,-1)(-2,-1)";
    }
  }, // end created
  // ===============================================================
  // METHODS
  // ===============================================================
  methods: {
    // used by Skew ← → ↑ ↓
    linearTransform : function (useA, m){
      var xPolygon = useA ? this.aPolygon : this.dPolygon;
      transform(xPolygon, m);
      isDirty(xPolygon);
      this.aIsMaster = useA;
    },
    // should be changed
    roundPolygon : function (useA){
      var xPolygon = useA ? this.aVertices : this.dVertices;
      var precision = useA ? this.aPrecision : this.dPrecision;
      var n = xPolygon.length; // number of points

      this.aIsMaster = useA;

      for (var i = 0; i < n; i++) {
        xPolygon[i].cx = Math.round(xPolygon[i].cx*precision)/precision;
        xPolygon[i].cy = Math.round(xPolygon[i].cy*precision)/precision;
      }
    },
    centroidAtZero: function (useA) {
      var xPolygon = useA ? this.aPolygon : this.dPolygon;
      var centroidX = useA ? this.centroidA : this.centroidD;

      atzero(xPolygon, [centroidX.cx,centroidX.cy]);
      isDirty(xPolygon);
      this.aIsMaster = useA;
    },
    santaloAtZero: function (useA){
      var xPolygon = useA ? this.aPolygon : this.dPolygon;

      atzero(xPolygon,centroid(xPolygon));
      for (var i = 0; i < 10; i++) {
        translate(xPolygon,centroid(dualPolygon(xPolygon)));
      };
      isDirty(xPolygon);
      this.aIsMaster = useA;
    },
    // ===============================================================
    // Ping-Pong
    // ===============================================================
    startCentroidPingPong: function (){
      var ad = true;
      vm.cID = setInterval(function () {
        vm.centroidAtZero(ad);
        ad = !ad;
      }, 100);
    },
    stopCentroidPingPong: function (){
      if(vm.cID)
        window.clearInterval(vm.cID);
      vm.cID = null;
    },
    startSantaloPingPong: function (){
      var ad = true;
      vm.sID = setInterval(function () {
        vm.santaloAtZero(ad);
        ad = !ad;
      }, 100);
    },
    stopSantaloPingPong: function (){
      if(vm.sID)
        window.clearInterval(vm.sID);
      vm.sID = null;
    },
    // ===============================================================
    // Mouse interractions
    // ===============================================================
    addPoint: function addPoint(evt, ind, useA) {
      if(!evt.shiftKey)
        return;

      var getPos = getMousePos;
      var svg = evt.currentTarget.closest("svg");
      var point = svg.createSVGPoint();
      var transform = svg.getScreenCTM().inverse();
      var xPolygon = useA ? this.aPolygon : this.dPolygon;
      var xSelected = useA ? this.aSelected : this.dSelected;

      this.aIsMaster = useA;

      getPos(evt, point);
      var newPt = point.matrixTransform(transform);
      xPolygon.splice(2*(ind+1), 0, newPt.x, newPt.y);
      xSelected.splice(ind+1, 0, false);
    },
    // ------------------
    startMove: function startMove(evt, ind, useA) {
      var touch = evt.type === "touchstart";
      if (!touch && evt.button !== 0) return;
      var events = touch ? {
        move: "touchmove",
        stop: "touchend"
      } : {
        move: "mousemove",
        stop: "mouseup"
      };
      var getPos = touch ? getTouchPos : getMousePos;
      var svg = evt.currentTarget.closest("svg");
      var point = svg.createSVGPoint();
      var transform = svg.getScreenCTM().inverse();
      var xPolygon = useA ? this.aPolygon : this.dPolygon;
      var xSelected = useA ? this.aSelected : this.dSelected;
      var afterSelected;

      if( vm.useCtrl ? evt.ctrlKey : evt.metaKey )
      {
        afterSelected = !xSelected[ind];
      } else if (evt.altKey) {
        afterSelected = true;
        xSelected.fill(true);
      } else {
        afterSelected = xSelected[ind];
        if (!xSelected[ind]) {
          xSelected.fill(false);
        }
      };
      xSelected[ind] = true;
      //isDirty(xSelected);

      this.aIsMaster = useA;

      var moving = true;
      var newPt, oldPt;
      getPos(evt, point);
      oldPt = point.matrixTransform(transform);

      var updateFn = function updateFn() {
        if (moving) requestAnimationFrame(updateFn);

        // Map the screen pixels back to svg coords
        newPt = point.matrixTransform(transform);
        var dx = newPt.x - oldPt.x;
        var dy = newPt.y - oldPt.y;
        var changed = false;
        oldPt = newPt;
        for (var i = 0; i < xSelected.length; i++)
          if (xSelected[i]) {
            xPolygon[2*i] += dx;
            xPolygon[2*i+1] += dy;
            changed = true;
          };
        if (changed) {
          isDirty(xPolygon);
        }
      };
      var moveFn = function moveFn(evt) {
        return getPos(evt, point);
      };
      var stopFn = function stopFn(evt) {
        moving = false;
        xSelected.$set(ind,afterSelected);
        svg.removeEventListener(events.move, moveFn);
        svg.removeEventListener(events.stop, stopFn);
      };

      requestAnimationFrame(updateFn);
      moveFn(evt);

      svg.addEventListener(events.move, moveFn);
      svg.addEventListener(events.stop, stopFn);
      //this.stopPingPong()
    }, // end startMove
    setExample: function setExample() {
      if (!this.selectedExample)
        return;
      this.aIsMaster = this.selectedExample.aim;
      if (this.aIsMaster)
        this.aString = this.selectedExample.data;
      else
        this.dString = this.selectedExample.data;
      // reset
      Vue.nextTick(function () {
        vm.selectedExample = {};
      });
    }
  } // end methods
});





// ===============================================================
// FUNCTIONS
// ===============================================================


//----------------------------------------------
// inform Vue that the array has changed by direct manipulation
function isDirty(a){
  a.$set(0,a[0]);
}

//----------------------------------------------
// convert polygon array to vertices like [{cx1,cy1,selected1},...]
function vertices(poly,sel){
  var n = poly.length;
  var v = [];
  for (var i = 0, j = 0; i < n-1; i += 2, j++) {
    v.push({cx: poly[i], cy: poly[i+1], selected: sel[j]});
  }
  return v;
}

//----------------------------------------------
// create edges aray like [{x1,y1,x2,y2},...]
// from plygon array like [x1,y1,x2,y2,...]
function edgesOfPolygon(poly){
  var n = poly.length; // number of points
  var edges = new Array(); // will contain all the edges like {x1,y1,x2,y2}

  for (var i = 0; i < n-1; i+=2) {
    edges.push({
      x1 : poly[i],
      y1 : poly[i+1],
      x2 : poly[(i+2)%n],
      y2 : poly[(i+3)%n]
    });
  }

  return edges;
}

//----------------------------------------------
// vertices to string
function polygon2string(poly){
  var n = poly.length; // number of points
  var str = "";
  for (var i = 0; i < n-1; i+=2) {
    str += "("+poly[i]+","+poly[i+1]+")";
  }
  return str;
}

//----------------------------------------------
// convert string to poly array
function string2polygon(str){
  return str.replace(/^[^-0-9.e]*|[^-0-9.e]*$/g,"").split(/[^-0-9.e]+/).map(parseFloat);
}

//----------------------------------------------
// save the string representation ans the master status to the localStorage
function polystr2localStorage(str,aIsMaster){
  try {
    localStorage.setItem("polygoneStr", str);
    localStorage.setItem("aIsMaster", aIsMaster);
  } catch(e) {
    console.log('Can\'t save '+(aIsMaster ? "A" : "D")+' to Local Storage :(');
  }
}

//----------------------------------------------
// pointer position fo PC and tablet/phone
function getMousePos(mouseEvent, point) {
  point.x = mouseEvent.clientX;
  point.y = mouseEvent.clientY;
}
function getTouchPos(touchEvent, point) {
  point.x = touchEvent.touches[0].clientX;
  point.y = touchEvent.touches[0].clientY;
}
