var vm = new Vue({
  el: "#app",
  data: {
    aPolygon: [], // the A polygons like [x1,y1,x2,y2,...]
    dPolygon: [], // the D(ual) polygons like [x1,y1,x2,y2,...]
    aSelected: [], // the selection status of A vertices like [true,false,...]
    dSelected: [], // the selection status of D vertices like [true,false,...]
    aIsMaster : true, // decide the master / slave relation between A and D
    graphSize : 7, // the number of visible integer points, used to Zoom in and out
    vertexSize : .05, // the radius of vertices
    edgeWidth : .035, // the width of the edges
    integerPointSize : .049, // the radius of all integer points
    aPrecision : 4, // the parameter used to round up to 1/aPrecision
    dPrecision : 4, // the parameter used to round up to 1/dPrecision
    // some examples
    examples : [
      { title: "Convex Asymetric 3/2",   aim: true,  data: "(0,1)(1,0)(-1,-1)" },
      { title: "Convex Symetric 2 = B∞", aim: true,  data: "(1,-1)(1,1)(-1,1)(-1,-1)" },
      { title: "Convex Symetric 2 = B1", aim: true,  data: "(1,0)(0,1)(-1,0)(0,-1)" },
      { title: "Pentagone",              aim: true,  data: "(1.0,0.0)(0.309016994375,0.951056516295)(-0.809016994375,0.587785252292)(-0.809016994375,-0.587785252292)(0.309016994375,-0.951056516295)" },
      { title: "Heptagone",              aim: true,  data: "(1.0,0.0)(0.62348980185873359,0.7818314824680298)(-0.22252093395631434,0.97492791218182362)(-0.90096886790241903,0.43388373911755823)(-0.90096886790241915,-0.43388373911755801)(-0.22252093395631459,-0.97492791218182362)(0.62348980185873337,-0.78183148246802991)" },
      { title: "Local min 1",            aim: true,  data: "(2.1164884152430274,-0.9808503160461923)(0.4186726225249168,1.3776969390511773)(-1.5471978996261544,1.8125956552458335)(-1.548325415208969,-0.4233818732506383)(0.5388623575395944,-1.7691976538545588)" },
      { title: "Local min with tr < 0",  aim: true,  data: "(0,2.738933751725064)(-0.81097131344343,-0.5490207249871223)(-0.9030767313033464,-1.4106316931345635)(0.9030767313033464,-1.4106316931345635)(0.81097131344343,-0.5490207249871223)" },
      { title: "Local min with offset ellipses",  aim: true,  data: "(0.6823290855758224,-1.3212840710144018)(1.24183716331364,1.076296918677146)(-0.21606907055895674,1.4572914322587038)(-1.3572928337167007,0.3965484708766234)(-0.36537724128850724,-1.6925166803381313)" }
    ],
    selectedExample : {},
    isotropicPositionA : false, //
    showEllipses: "normalized", // show or not the ellipse of A and D (normalized or not)?
    centerEllipses: "zero", // centered at zero or at the centroid ?
    ellipseTypeA: "binet", // which ellipse of A ?
    ellipseTypeD: "legendre", // which ellipse of D ?
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
    // *****************************************
    // the polygon A like [{cx,cy,selected}]
    aVertices: function() {
      return vertices(this.aPolygon, this.aSelected);
    },
    // *****************************************
    // and it's dual D like [x1,y1,x2,y2,...]
    dVertices: function() {
      return vertices(this.dPolygon, this.dSelected);
    },
    // *****************************************
    // the string representation of A like "(x1,y1)(x2,y2)..."
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
        Vue.nextTick(function () {
          vm.toIsotropicA(); // set A to isotropic position if needed
        });
      }
    },
    // *****************************************
    // the string representation of D like "(x1,y1)(x2,y2)..."
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
        Vue.nextTick(function () {
          vm.toIsotropicA(); // set A to isotropic position if needed
        });
      }
    },
    // *****************************************
    volumeA : function () {
      return volume(this.aPolygon);
    },
    // *****************************************
    volumeD : function () {
      return volume(this.dPolygon);
    },
    // *****************************************
    volumeAD : function () {
      return this.volumeA*this.volumeD;
    },
    // *****************************************
    centroidA : function () {
      var c = centroid(this.aPolygon);
      return { cx:c[0], cy:c[1] };
    },
    // *****************************************
    centroidD : function () {
      var c = centroid(this.dPolygon);
      return { cx:c[0], cy:c[1] };
    },
    // *****************************************
    aLines: function () {
      return edgesOfPolygon(this.aPolygon);
    }, // end aLines()
    // *****************************************
    dLines: function () {
      return edgesOfPolygon(this.dPolygon);
    }, // end dLines
    // *****************************************
    // second Minkovski for A
    z2A: function(){
      return zxz(this.aPolygon);
    },
    // *****************************************
    // second Minkovski for D
    z2D: function(){
      return zxz(this.dPolygon);
    },
    // *****************************************
    // second matrix factor of the Hessian (if DA)
    factorDA: function(){
      var z2DA = matrixByMatrix(this.z2D,this.z2A);
      return [
        1 - 16*z2DA[0]/this.volumeAD,
        0 - 16*z2DA[1]/this.volumeAD,
        0 - 16*z2DA[2]/this.volumeAD,
        1 - 16*z2DA[3]/this.volumeAD
      ];
    },
    // *****************************************
    // second matrix factor of the Hessian (if AD)
    factorAD: function(){
      var z2AD = matrixByMatrix(this.z2A,this.z2D);
      return [
        1 - 16*z2AD[0]/this.volumeAD,
        0 - 16*z2AD[1]/this.volumeAD,
        0 - 16*z2AD[2]/this.volumeAD,
        1 - 16*z2AD[3]/this.volumeAD
      ];
    },
    // *****************************************
    // the Hessian (that has sens only at critical points) using factor DA
    hessianDA: function(){
      return matrixByScalar(-12*this.volumeD,matrixByMatrix(this.z2A,this.factorDA));
    },
    // *****************************************
    // the Hessian (that has sens only at critical points) using factor AD
    hessianAD: function(){
      return matrixByScalar(-12*this.volumeD,matrixByMatrix(this.z2A,this.factorAD));
    },
    inertiaA: function(){
      var center = this.centerEllipses == "centroid" ? this.centroidA : {cx:0,cy:0};
      var i = this.inertia(this.z2A,center,this.volumeA,this.showEllipses);
      if (this.ellipseTypeA == "binet") {
        i.rx = 1/i.rx;
        i.ry = 1/i.ry;
      }
      return i;
    },
    inertiaD: function(){
      var center = this.centerEllipses == "centroid" ? this.centroidD : {cx:0,cy:0};
      var i = this.inertia(this.z2D,center,this.volumeD,this.showEllipses);
      if (this.ellipseTypeD == "binet") {
        i.rx = 1/i.rx;
        i.ry = 1/i.ry;
      }
      return i;
    },
    isotropicPositionASetter : {
      set: function(newI){
        this.isotropicPositionA = newI;
        if (newI){
          this.toIsotropicA();
        }
      },
      get: function(){
        return this.isotropicPositionA;
      }
    },
    // ===============================================================
    // SVG parameters
    // *****************************************
    graphPos: function graphPos() {
      var size = this.graphSize;
      var half = size / 2;
      return {
        viewBox: [-half, -half, size, size].join(" "),
        width: size
      };
    },
    // *****************************************
    netSize: function() {
      return 2*Math.floor(this.visi/2) + 3;
    },
    // *****************************************
    netOrigin: function() {
      return Math.floor(this.graphSize/2) + 1;
    },
    isSymetric: function() {
      const symprecision = 1e-10;
      if ( !this.aPolygon ){
        return false;
      }
      var n = this.aPolygon.length;
      if (n%4) {
        return false;
      }
      for (var i = 0; i < n/2; i++) {
        if (Math.abs(this.aPolygon[i]+this.aPolygon[i+n/2]) > symprecision){
          return false;
        }
      }
      return true;
    }
  }, // end computed
  // ================================================================
  // CREATED
  // ================================================================
  // when the app is starting ...
  created: function () {
    var urla = /a=([^&]*)/.exec(window.location.search);
    if (urla && urla.length > 1){
      // get the coordinates from the 'a' get parameter
      this.aString = decodeURIComponent(urla[1]);
      this.aIsMaster = true;
    }
    else{
      try {
        // try to get the coordinates from the local storage
        this.aIsMaster = JSON.parse(localStorage.getItem("aIsMaster", "true"));
        if (this.aIsMaster)
          this.aString = localStorage.getItem("polygoneStr", "(0,1)(1,0)(-1,-1)(-2,-1)");
        else
          this.dString = localStorage.getItem("polygoneStr", "(0,1)(1,0)(-1,-1)(-2,-1)");
      } catch(e) {
        // set a default polygon
        this.aString = "(0,1)(1,0)(-1,-1)(-2,-1)";
        this.aIsMaster = true;
      }
    }
    if (/[&?]c/.exec(window.location.search)){
      this.centroidAtZero(true);
    }
  }, // end created
  // ================================================================
  // METHODS
  // ================================================================
  methods: {
    // --------------------------------------------------------------
    // used by inertiaA and inertiaD
    inertia: function(z2,centroid,volume,type){
      var ba = matrix2ellipse(z2,[centroid.cx*Math.sqrt(volume),centroid.cy*Math.sqrt(volume)]);
      var transform = "rotate("+ba.theta*180/Math.PI+" "+centroid.cx+" "+centroid.cy+")"
      var norm = (type == "normalized") ? Math.sqrt(volume)/2 : 1; // normalization factor
      // Not used any more
      // switch (type){
      //   case "normsqrtV": // not used any more
      //       norm = Math.sqrt(volume);
      //     break;
      //   case "4normsqrtV":
      //       norm = Math.sqrt(volume)/2;
      //     break;
      //   case "normV": // not used any more
      //       norm = volume;
      //     break;
      // }
      return {
        cx:centroid.cx,
        cy:centroid.cy,
        rx:ba.rx/norm,
        ry:ba.ry/norm,
        transform:transform
      };
    },
    // --------------------------------------------------------------
    // used by Skew ← → ↑ ↓
    linearTransform : function (useA, m){
      var xPolygon = useA ? this.aPolygon : this.dPolygon;
      transform(xPolygon, m);
      isDirty(xPolygon);
      this.aIsMaster = useA;
    },
    // --------------------------------------------------------------
    // should be changed
    roundPolygon : function (useA){
      var xPolygon = useA ? this.aPolygon : this.dPolygon;
      var precision = useA ? this.aPrecision : this.dPrecision;
      var n = xPolygon.length; // number of points

      this.aIsMaster = useA;

      for (var i = 0; i < n; i++) {
        xPolygon[i] = Math.round(xPolygon[i]*precision)/precision;
      }
      isDirty(xPolygon);
    },
    // --------------------------------------------------------------
    // translate the polygon to put the centroid at zero
    centroidAtZero: function (useA) {
      var xPolygon = useA ? this.aPolygon : this.dPolygon;
      var centroidX = useA ? this.centroidA : this.centroidD;
      var c = [centroidX.cx,centroidX.cy];
      const centerprecision = 1e-10;

      // iterate because the centroid is not exact if 0 is outside
      do {
        atzero(xPolygon, c);
        c = centroid(xPolygon);
      } while (Math.abs(c[0]) + Math.abs(c[0]) > centerprecision);

      isDirty(xPolygon);
      this.aIsMaster = useA;
    },
    // --------------------------------------------------------------
    // translate the polygon to put APPROXIMATIVELY the Santaló point at zero
    santaloAtZero: function (useA){
      var xPolygon = useA ? this.aPolygon : this.dPolygon;

      santalo2zero(xPolygon,10);
      isDirty(xPolygon);
      this.aIsMaster = useA;
    },
    // --------------------------------------------------------------
    // pout the A polygon in isotropic position
    toIsotropicA: function () {
      if (!this.isotropicPositionA){
        return;
      }
      var aPolygon = this.aPolygon;
      atzero(aPolygon, centroid(aPolygon));

      var z2 = zxz(aPolygon);
      var ba = matrix2ellipse(z2,[0,0]);
      var t = ba.theta;
      var kx = 1, ky = 1;
      var k = 1;
      switch(this.isotropicPositionA) {
        case "Ĩ=1":
            k = Math.sqrt(volume(aPolygon));
            kx = k/ba.rx;
            ky = k/ba.ry;
          break;
        case "I=1":
            kx = Math.pow(ba.ry,1/4)/Math.pow(ba.rx,3/4);
            ky = Math.pow(ba.rx,1/4)/Math.pow(ba.ry,3/4);
          break;
        case "VA=VD":
            k = Math.pow(volume(dualPolygon(aPolygon))/volume(aPolygon),1/4);
            kx = k*Math.sqrt(ba.ry/ba.rx);
            ky = k*Math.sqrt(ba.rx/ba.ry);
          break;
        case "VA=1":
            k = Math.sqrt(volume(aPolygon));
            kx = Math.sqrt(ba.ry/ba.rx)/k;
            ky = Math.sqrt(ba.rx/ba.ry)/k;
            // kx = ba.ry/(sqrtVolX*sqrtVolX);
            // ky = ba.rx/(sqrtVolX*sqrtVolX);
          break;
        case "keep VA":
            kx = Math.sqrt(ba.ry/ba.rx);
            ky = Math.sqrt(ba.rx/ba.ry);
          break;
      }
      transform(aPolygon,[Math.cos(t),-Math.sin(t),Math.sin(t),Math.cos(t)]);
      transform(aPolygon,[kx,0,0,ky]);
      transform(aPolygon,[Math.cos(t),Math.sin(t),-Math.sin(t),Math.cos(t)]);
      // redraw it
      this.aIsMaster = true;
      isDirty(aPolygon);
    },
    makeSymetric: function () {
      var xPolygon = this.aIsMaster ? this.aPolygon : this.dPolygon;
      var n = 2*Math.round(xPolygon.length/4);
      for (var i = 0; i < n; i++) {
        xPolygon[i+n] = -xPolygon[i];
      }
      isDirty(xPolygon);
    },
    // ===============================================================
    // Ping-Pong
    // ===============================================================
    // --------------------------------------------------------------
    startCentroidPingPong: function (){
      var ad = true;
      vm.cID = setInterval(function () {
        vm.centroidAtZero(ad);
        ad = !ad;
      }, 100);
    },
    // --------------------------------------------------------------
    stopCentroidPingPong: function (){
      if(vm.cID)
        window.clearInterval(vm.cID);
      vm.cID = null;
      Vue.nextTick(function () {
        vm.toIsotropicA(); // set A to isotropic position if needed
      });
    },
    // --------------------------------------------------------------
    startSantaloPingPong: function (){
      var ad = true;
      vm.sID = setInterval(function () {
        vm.santaloAtZero(ad);
        ad = !ad;
      }, 100);
    },
    // --------------------------------------------------------------
    stopSantaloPingPong: function (){
      if(vm.sID)
        window.clearInterval(vm.sID);
      vm.sID = null;
      Vue.nextTick(function () {
        vm.toIsotropicA(); // set A to isotropic position if needed
      });
    },
    // ==============================================================
    // Mouse interactions
    // ==============================================================
    // --------------------------------------------------------------
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
    // --------------------------------------------------------------
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
        afterSelected = !xSelected.reduce((a,s) => a && s,true);
        xSelected.fill(afterSelected);
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

      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
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
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      var moveFn = function moveFn(evt) {
        return getPos(evt, point);
      };
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      var stopFn = function stopFn(evt) {
        moving = false;
        xSelected.$set(ind,afterSelected);
        svg.removeEventListener(events.move, moveFn);
        svg.removeEventListener(events.stop, stopFn);
        Vue.nextTick(function () {
          vm.toIsotropicA(); // set A to isotropic position if needed
        });
      };

      requestAnimationFrame(updateFn);
      moveFn(evt);

      svg.addEventListener(events.move, moveFn);
      svg.addEventListener(events.stop, stopFn);
      //this.stopPingPong()
    }, // end startMove
    // --------------------------------------------------------------
    // Set the example selected in the dropbox
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
        vm.toIsotropicA(); // set A to isotropic position if needed
      });
    }, // end startMove
    // --------------------------------------------------------------
    // Set the example selected in the dropbox
    selectAll: function selectAll() {
      var xSelected = this.aIsMaster ? this.aSelected : this.dSelected;
      xSelected.fill(true);
      isDirty(xSelected);
    }
  }, // end methods
  ready: function() {
      window.addEventListener('keydown', function(event) {
        // If ctrl+A was pressed...
        if (event.keyCode == 65 && (event.ctrlKey || event.metaKey) && document.activeElement.type != "text") {
          event.preventDefault();
          vm.selectAll();
        }
      });
    }
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
// create edges array like [{x1,y1,x2,y2},...]
// from polygon array like [x1,y1,x2,y2,...]
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
// convert string to polygon array
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
// pointer position of PC and tablet/phone
function getMousePos(mouseEvent, point) {
  point.x = mouseEvent.clientX;
  point.y = mouseEvent.clientY;
}
function getTouchPos(touchEvent, point) {
  point.x = touchEvent.touches[0].clientX;
  point.y = touchEvent.touches[0].clientY;
}
