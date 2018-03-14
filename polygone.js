/*
[x,y] is a point (array of two reals)
[x1,y1,x2,y2] is a segment (array of four reals)
[x1,y1,x2,y2,...,xn,yn] is a polygon (array of 2n reals)
[m11,m21,m12,m22] is 2x2 matrix (array of four reals)
*/

// -------------------------------------------------
// add the new array a to this
Array.prototype.pushArray = function(a){
  Array.prototype.push.apply(this,a);
}

// -------------------------------------------------
// return the determinant of a matrix
function determinant(m11,m21,m12,m22)
{
  return m11*m22 - m12*m21;
}

// -------------------------------------------------
// return the dual point of a segment (line) s
// if the line pass throw zero returns [] (empty array)
function dualPoint(x1,y1,x2,y2) {
  var d = determinant(x1,y1,x2,y2);
  return d ? [(y2-y1)/d, (x1-x2)/d] : []
}

// -------------------------------------------------
// return the dual polygon of a polygon `poly`
function dualPolygon(poly) {
  var n = poly ? poly.length : 0; // number of vertices = number of edges
  var dualPoly = []; // the dual polygon will be stored inside

  for (var i = n-2, j = 0; i >= 0; i-=2, j = i+2) {
    dualPoly.pushArray(dualPoint(poly[i],poly[i+1],poly[j],poly[j+1]));
  }
  return dualPoly;
}

// -------------------------------------------------
// return the volume of a polygon `poly`
function volume(poly){
  var n = poly.length; // number of points
  var sumdet = 0; // the volume x2 will be here

  for (var i = n-2, j = 0; i >= 0; i-=2, j = i+2) {
    sumdet += Math.abs(determinant(poly[i],poly[i+1],poly[j],poly[j+1]));
  }

  return sumdet/2;
}

// -------------------------------------------------
// return the centroid of a polygon `poly`
function centroid(poly){
  var n = poly.length; // number of points
  var d; // temporary determinant
  var a = 0; // the total area (up to sign)
  var x = 0, y = 0; // (x/3/a,y/3/a) will be the centroid

  for (var i = n-2, j = 0; i >= 0; i-=2, j = i+2) {
    d = Math.abs(determinant(poly[i],poly[i+1],poly[j],poly[j+1]));
    a += d;
    x += (poly[i]+poly[j])*d;
    y += (poly[i+1]+poly[j+1])*d;
  }

  return a ? [x/3/a, y/3/a] : [];
}

// -------------------------------------------------
// apply linear transform m to polygon `poly`
function transform(poly,m){
  var n = poly.length; // number of points
  var x,y; // temp variables
  for (var i = 0; i < n-1; i+=2) {
    x = poly[i];
    y = poly[i+1];
    poly[i] = m[0]*x + m[2]*y;
    poly[i+1] = m[1]*x + m[3]*y;
  }
}

// -------------------------------------------------
// translate by v the polygon `poly`
function translate(poly,v){
  var n = poly.length; // number of points
  for (var i = 0; i < n-1; i+=2) {
    poly[i] = poly[i]+v[0];
    poly[i+1] = poly[i+1]+v[1];
  }
}

// -------------------------------------------------
// put the point pt at 0 = translate by -pt the polygon `poly`
function atzero(poly,pt){
  var n = poly.length; // number of points
  for (var i = 0; i < n-1; i+=2) {
    poly[i] = poly[i]-pt[0];
    poly[i+1] = poly[i+1]-pt[1];
  }
}

// =================================================
// Hessian calculations (Minkowski tensor)
// =================================================

// -------------------------------------------------
// functions used in xzx
function x2(px,qx) {
  return px*px+px*qx+qx*qx;
}
function xy(px,py,qx,qy) {
  return px*py+(px*qy+qx*py)/2+qx*qy;
}
// -------------------------------------------------
// return the Minkowski tensor Z.ZdZ
function zxz(poly){
  var n = poly.length; // number of points
  var d; // temporary determinant
  var z2x2 = 0, z2y2 = 0, z2xy=0; // the zxz will be [x2 xy; xy y2]

  for (var i = n-2, j = 0; i >= 0; i-=2, j = i+2) {
    d = Math.abs(determinant(poly[i],poly[i+1],poly[j],poly[j+1]));
    z2x2 += d*x2(poly[i],poly[j]);
    z2y2 += d*x2(poly[i+1],poly[j+1]);
    z2xy += d*xy(poly[i],poly[i+1],poly[j],poly[j+1]);
  }

  return [z2x2/12,z2xy/12,z2xy/12,z2y2/12];
}
// -------------------------------------------------
// calculate the product of two matrices
// [a0,a2] [b0,b2]
// [a1,a3] [b1,b3]
function matrixByMatrix(a,b){
  return [
    a[0]*b[0]+a[2]*b[1],
    a[1]*b[0]+a[3]*b[1],
    a[0]*b[2]+a[2]*b[3],
    a[1]*b[2]+a[3]*b[3]
  ];
}
// -------------------------------------------------
// calculate the product of matrix by scalar
function matrixByScalar(k,a){
  return [k*a[0],k*a[1],k*a[2],k*a[3]];
}
// -------------------------------------------------
// calculate from quadratic form matrix the ellipse pareters
// and return {rx,ry,theta} where theta (in radians) is the angle with rx
function matrix2ellipse(q,c){
  var e = [q[0]-c[0]*c[0],q[1]-c[0]*c[1],q[2]-c[1]*c[0],q[3]-c[1]*c[1]];
  // if diagonal matrix
  if (e[1] == 0){
    return {rx:Math.sqrt(e[0]),ry:Math.sqrt(e[3]),theta:0};
  }
  var tr = e[0]+e[3];
  var det = e[0]*e[3]-e[1]*e[1];
  var delta = Math.sqrt(Math.abs(tr*tr-4*det)); // abs for preventing precision errors
  var lx = (tr+delta)/2;
  var ly = (tr-delta)/2;
  var theta = Math.atan((lx-e[0])/e[1]);
  return {rx:Math.sqrt(lx),ry:Math.sqrt(ly),theta:theta};
}
