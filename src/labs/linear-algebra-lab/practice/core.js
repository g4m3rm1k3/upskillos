import { mat, vec, problem } from './helpers.js'

const task=(id,title,difficulty,data,solution,checks,hints)=>problem(id,title,difficulty,data,solution,checks.map(([name,message])=>({name,message,tolerance:1e-6})),hints)
const data=(fields,prompt)=>({setup:Object.entries(fields).map(([name,value])=>`${name}=${Array.isArray(value)?(Array.isArray(value[0])?mat(value):vec(value)):value};`).join('\n'),prompt})
const mul=(A,x)=>A.map(row=>row.reduce((sum,v,i)=>sum+v*x[i],0))
const full=r=>{let A;do{A=[[r.nonzero(-4,4),r.nonzero(-3,3)],[r.nonzero(-3,3),r.nonzero(-4,4)]]}while(A[0][0]*A[1][1]===A[0][1]*A[1][0]);return A}
const system=r=>{const A=full(r);return{A,b:mul(A,[r.nonzero(-4,4),r.nonzero(-4,4)])}}
const plane=r=>[[1,0],[0,1],[r.nonzero(-3,3),r.nonzero(-3,3)]]
const under=r=>[[1,r.nonzero(-3,3),r.nonzero(-3,3)],[0,1,r.nonzero(-3,3)]]
const pivoted=r=>[[0,r.nonzero(-4,4)],[r.nonzero(-4,4),r.nonzero(-3,3)]]
const design=()=>[[1,0],[1,1],[1,2],[1,3]]
const response=r=>{const a=r.nonzero(-4,4),b=r.nonzero(-3,3),e=r.int(1,3);return[a+e,a+b-e,a+2*b-e,a+3*b+e]}
const symmetric=r=>{const a=r.int(3,6),b=r.int(1,2);return[[a,b],[b,a]]}
const cloud=r=>{const a=r.int(3,6),b=r.int(1,2),u=r.int(-8,8),v=r.int(-8,8);return[[u-a,v-b],[u-b,v-a],[u+b,v+a],[u+a,v+b]]}
const spectral=r=>{const a=r.int(3,6),b=r.int(1,2);return[[a,b],[b,a],[0,0]]}
const gs=String.raw`a=A(:,1);
b=A(:,2);
q1=a/norm(a);
u=b-q1*(q1'*b);
q2=u/norm(u);
Q=[q1 q2];
R=Q'*A;`
const center=String.raw`mu=[mean(X(:,1)) mean(X(:,2))];
n=size(X,1);
C=X-repmat(mu,n,1);
covariance=C'*C/(n-1);`

export const corePractice={
'laml-elimination':[
 task('solve-two-signals','Recover two mixed signals','Warm-up',r=>data(system(r),'A mixes two unknown signals into measured totals b. Store the recovered values in x and the original-equation residual A*x-b in residual.'),String.raw`x=A\b;
residual=A*x-b;`,[['x','Solve using the supplied A and b, preserving unknown order.'],['residual','Subtract measured totals from reconstructed totals.']],['Each row describes one measurement.','Solve simultaneous equations rather than dividing matching entries.','Use x=A\\b, then residual=A*x-b.']),
 task('reduce-three-equations','Read a three-variable reduced system','Warm-up',r=>{const A=[[r.int(1,3),r.nonzero(-3,3),r.nonzero(-3,3)],[0,r.int(1,3),r.nonzero(-3,3)],[0,0,r.int(1,3)]];return data({A,b:mul(A,[r.nonzero(-3,3),r.nonzero(-3,3),r.nonzero(-3,3)])},'Reduce [A b] into reduced. Store the three solution values from its final column in x. The final column contains totals, not another unknown.');},String.raw`reduced=rref([A b]);
x=reduced(:,4);`,[['reduced','Reduce the augmented matrix, including b.'],['x','Read column 4 of the reduced system.']],['Three unknown columns require a fourth totals column.','Call rref on [A b], not A alone.','Use reduced=rref([A b]), then x=reduced(:,4).']),
 task('contradictory-measurements','Distinguish redundancy from contradiction','Apply',r=>{const u=r.nonzero(-3,3),v=r.nonzero(-3,3),k=r.int(2,4),t=r.nonzero(-5,5),e=r.pick([0,r.nonzero(-3,3)]);return data({A:[[u,v],[k*u,k*v]],b:[t,k*t+e]},'Store rank(A) in coefficientRank and rank([A b]) in augmentedRank. Store consistent=1 if they match, otherwise 0. Dependent coefficient rows can still disagree about totals.');},String.raw`coefficientRank=rank(A);
augmentedRank=rank([A b]);
consistent=0;
if coefficientRank==augmentedRank
 consistent=1;
end`,[['coefficientRank','Count independent coefficient directions.'],['augmentedRank','Include totals when testing consistency.'],['consistent','Use numeric 1 only if both ranks agree.']],['A redundant equation repeats information including its total.','A pivot in the augmented column means a contradiction.','Compare rank(A) with rank([A b]) inside an if statement.']),
 task('repair-proposed-solution','Repair an incorrect coefficient estimate','Apply',r=>data({...system(r),guess:[r.int(5,8),r.int(-8,-5)]},'Store deficit=b-A*guess. Solve A*correction=deficit into correction, then store guess+correction in repaired. Store A*repaired-b in residual. A correction in measurement space is different from one in coefficient space.'),String.raw`deficit=b-A*guess;
correction=A\deficit;
repaired=guess+correction;
residual=A*repaired-b;`,[['deficit','Subtract the current prediction from the required totals.'],['correction','Solve for a coefficient change.'],['repaired','Add the change to the supplied guess.'],['residual','The repaired vector must satisfy the original system.']],['A maps coefficient changes into measurement changes.','Compute the measurement deficit first.','Use correction=A\\deficit, then repaired=guess+correction.']),
 task('two-output-calibration','Calibrate two outputs with one mixing matrix','Transfer',r=>{const A=full(r);return data({A,b1:mul(A,[r.nonzero(-3,3),r.nonzero(-3,3)]),b2:mul(A,[r.nonzero(-3,3),r.nonzero(-3,3)])},'A measured two different signals b1 and b2. Store their recovered coefficient vectors as columns of recovered, in that order. Store A*recovered-[b1 b2] in residuals.');},String.raw`x1=A\b1;
x2=A\b2;
recovered=[x1 x2];
residuals=A*recovered-[b1 b2];`,[['recovered','Keep the b1 answer first and the b2 answer second.'],['residuals','Check both reconstructed output columns.']],['Each right-hand side is a separate system.','Solve both against the same A.','Join x1=A\\b1 and x2=A\\b2 with recovered=[x1 x2].']),
 task('equivalent-row-measurements','Change equations while preserving their answer','Transfer',r=>data({...system(r),E:[[1,r.nonzero(-3,3)],[0,1]]},'E performs an invertible row operation. Store E*A in transformedA and E*b in transformedB. Solve that transformed system into x. Store A*x-b in residual to verify the original measurements.'),String.raw`transformedA=E*A;
transformedB=E*b;
x=transformedA\transformedB;
residual=A*x-b;`,[['transformedA','Apply the row operation to coefficients.'],['transformedB','Apply the identical operation to totals.'],['x','Solve the equivalent transformed system.'],['residual','Verify against the original equations.']],['A row operation combines entire equations.','Multiply E on the left of both A and b.','Solve transformedA\\transformedB, then check A*x-b.']),
],
'laml-span-rank':[
 task('feature-rank-nullity','Count information rather than feature names','Warm-up',r=>{const B=plane(r),p=r.nonzero(-3,3),q=r.nonzero(-3,3);return data({A:B.map(([a,b])=>[a,b,p*a+q*b])},'A has three feature columns. Store its independent-direction count in featureRank and size(A,2)-featureRank in nullity. Nullity counts invisible coefficient directions.');},'featureRank=rank(A);\nnullity=size(A,2)-featureRank;',[['featureRank','Derived columns do not necessarily add independent directions.'],['nullity','Subtract rank from the number of feature columns.']],['Compare the third feature with combinations of the first two.','Rank counts independent columns.','Use rank(A) and size(A,2)-rank(A).']),
 task('basis-coordinates','Represent an observation using a basis','Warm-up',r=>{const B=plane(r);return data({B,target:mul(B,[r.nonzero(-4,4),r.nonzero(-4,4)])},'The independent columns of B span target. Store the two basis coordinates in weights and B*weights-target in residual. Weights apply to whole columns.');},String.raw`weights=B\target;
residual=B*weights-target;`,[['weights','Use all three target coordinates to recover two weights.'],['residual','Reconstruct every target coordinate.']],['There are two unknown weights and three equations.','The supplied target is exactly in the span.','Use weights=B\\target and verify B*weights-target.']),
 task('target-span-test','Test whether a new observation belongs to the span','Apply',r=>{const B=plane(r),target=mul(B,[r.nonzero(-3,3),r.nonzero(-3,3)]);target[2]+=r.pick([0,r.nonzero(-3,3)]);return data({B,target},'Fit target using B. Store fitted=B*(B\\target), residualLength=norm(target-fitted), and inSpan=1 when residualLength<1e-8, otherwise 0. A rectangular solve does not itself prove exact span membership.');},String.raw`weights=B\target;
fitted=B*weights;
residualLength=norm(target-fitted);
inSpan=0;
if residualLength<1e-8
 inSpan=1;
end`,[['fitted','Use all coordinates in the rectangular solve.'],['residualLength','Measure the distance outside the span.'],['inSpan','Only a near-zero residual proves exact membership.']],['A rectangular solver can return an approximate fit.','Compute its residual before classifying the target.','Set inSpan to 1 only when norm(target-B*weights)<1e-8.']),
 task('reverse-engineer-redundancy','Recover the formula of a derived feature','Apply',r=>{const B=plane(r),p=r.nonzero(-4,4),q=r.nonzero(-4,4);return data({A:B.map(([a,b])=>[a,b,p*a+q*b])},'Feature 3 was derived from features 1 and 2. Store original columns 1 and 2 in basis, their reconstruction weights for column 3 in formula, and basis*formula in rebuilt. Store norm(rebuilt-A(:,3)) in errorLength.');},String.raw`basis=A(:,[1 2]);
formula=basis\A(:,3);
rebuilt=basis*formula;
errorLength=norm(rebuilt-A(:,3));`,[['basis','Choose independent original columns.'],['formula','Recover a weight for each basis feature.'],['rebuilt','Apply the recovered formula to every observation.'],['errorLength','The derived feature should reconstruct exactly.']],['Use original feature values rather than reduced columns.','Select A(:,[1 2]) as the basis.','Solve formula=basis\\A(:,3), then check the reconstruction.']),
 task('lost-observation-rank','Audit information after dropping observations','Transfer',r=>data({A:[[1,0],[0,r.nonzero(-3,3)],[r.nonzero(-3,3),0]],keep:r.pick([[1,3],[1,2]])},'Keep only rows indexed by keep. Store A(keep,:) in retained, rank(A) in originalRank, rank(retained) in retainedRank, and originalRank-retainedRank in rankLoss. Dropping a row may remove an entire identifiable direction.'),'retained=A(keep,:);\noriginalRank=rank(A);\nretainedRank=rank(retained);\nrankLoss=originalRank-retainedRank;',[['retained','Select the supplied rows in order.'],['originalRank','Measure information before cleaning.'],['retainedRank','Recompute rank after row selection.'],['rankLoss','Compare information loss, not deleted-row count.']],['Only the middle row measures the second coordinate.','Use A(keep,:) for row selection.','Compute the original and retained ranks separately, then subtract.']),
 task('new-feature-information','Decide whether an added feature helps','Transfer',r=>{const B=plane(r),candidate=mul(B,[r.nonzero(-3,3),r.nonzero(-3,3)]);candidate[2]+=r.pick([0,r.nonzero(-2,2)]);return data({B,candidate},'A candidate feature may add information beyond B. Store rank(B) in beforeRank, rank([B candidate]) in afterRank, and their difference in rankGain. A different name or scale does not establish independence.');},'beforeRank=rank(B);\nafterRank=rank([B candidate]);\nrankGain=afterRank-beforeRank;',[['beforeRank','Measure the current feature span.'],['afterRank','Append candidate as a column.'],['rankGain','Only a new direction increases rank.']],['A feature inside the current span adds no direction.','Form [B candidate].','Subtract rank(B) from rank([B candidate]).']),
],
'laml-nullspace':[
 task('construct-null-direction','Build an invisible coefficient change','Warm-up',r=>data({A:under(r)},'A has two pivot columns and a free third coordinate. Compute R=rref(A). Store a nullspace direction with third entry 1 in direction, using negated free-column coefficients for its first two entries. Store A*direction in nullResidual.'),String.raw`R=rref(A);
direction=[-R(1,3);-R(2,3);1];
nullResidual=A*direction;`,[['direction','Move free-column terms to the other side of the homogeneous equations.'],['nullResidual','An invisible direction must multiply to zero.']],['The homogeneous equations have totals zero.','Set the free third coordinate to 1.','Use direction=[-R(1,3);-R(2,3);1].']),
 task('parameterized-family','Generate a member of a solution family','Warm-up',r=>data({A:under(r),b:[r.nonzero(-5,5),r.nonzero(-5,5)],t:r.nonzero(-3,3)},'Compute particular with third entry 0 and a nullspace direction with third entry 1. Store candidate=particular+t*direction and measured=A*candidate. Use rref([A b]) so particular matches the supplied totals.'),String.raw`R=rref([A b]);
particular=[R(1,4);R(2,4);0];
direction=[-R(1,3);-R(2,3);1];
candidate=particular+t*direction;
measured=A*candidate;`,[['particular','Read reduced totals with the free coordinate zero.'],['direction','Use the homogeneous nullspace direction.'],['candidate','Scale the entire direction by t.'],['measured','Every member must reproduce b.']],['Reduce the augmented matrix.','Read particular from column 4 and direction from negated column 3.','Combine particular+t*direction and verify A*candidate.']),
 task('compare-model-equivalence','Detect equal predictions from different coefficients','Apply',r=>{const A=under(r),reference=[r.nonzero(-4,4),r.nonzero(-4,4),r.nonzero(-4,4)],n=[A[0][1]*A[1][2]-A[0][2],-A[1][2],1],t=r.nonzero(-3,3),alternative=reference.map((v,i)=>v+t*n[i]);alternative[0]+=r.pick([0,r.nonzero(-2,2)]);return data({A,reference,alternative},'Store alternative-reference in difference, norm(A*difference) in predictionChange, and equivalent=1 if predictionChange<1e-8, otherwise 0. Compare predictions rather than coefficient values.');},String.raw`difference=alternative-reference;
predictionChange=norm(A*difference);
equivalent=0;
if predictionChange<1e-8
 equivalent=1;
end`,[['difference','Compare coefficients in the stated order.'],['predictionChange','Apply A before measuring prediction changes.'],['equivalent','Equivalent models have the same outputs.']],['Differences between equivalent models lie in the nullspace.','Compute A*(alternative-reference).','Use a near-zero norm to set numeric equivalent to 1 or 0.']),
 task('choose-free-coefficient','Set one coefficient without changing predictions','Apply',r=>data({A:under(r),original:[r.nonzero(-3,3),r.nonzero(-3,3),r.nonzero(-3,3)],requestedThird:r.int(4,7)},'Preserve A*original while setting its third coefficient to requestedThird. Build a nullspace direction with third entry 1. Store the required parameter in t, the adjusted vector in adjusted, and A*(adjusted-original) in predictionDifference.'),String.raw`R=rref(A);
direction=[-R(1,3);-R(2,3);1];
t=requestedThird-original(3);
adjusted=original+t*direction;
predictionDifference=A*(adjusted-original);`,[['t','A unit third entry changes that coefficient by exactly t.'],['adjusted','Move only along the nullspace direction.'],['predictionDifference','The adjustment must preserve every prediction.']],['Find a direction invisible to A.','Its third entry is 1, so t is the requested value minus the current value.','Use adjusted=original+(requestedThird-original(3))*direction.']),
 task('minimum-length-family','Choose the shortest ambiguous solution','Transfer',r=>{const A=under(r),b=[r.nonzero(-4,4),r.nonzero(-4,4)];return data({A,b,particular:[b[0]-A[0][1]*b[1],b[1],0],direction:[A[0][1]*A[1][2]-A[0][2],-A[1][2],1]},'All solutions are particular+t*direction. The shortest is perpendicular to direction. Store -(direction\' *particular)/(direction\' *direction) in bestT, the resulting vector in shortest, direction\' *shortest in orthogonality, and A*shortest-b in residual.');},String.raw`bestT=-(direction'*particular)/(direction'*direction);
shortest=particular+bestT*direction;
orthogonality=direction'*shortest;
residual=A*shortest-b;`,[['bestT','Remove the component along the nullspace.'],['shortest','Apply the minimizing parameter to the family.'],['orthogonality','The shortest member is perpendicular to the invisible direction.'],['residual','Minimizing length must preserve all measurements.']],['Differentiate the squared length with respect to t.','At the minimum, direction\' *shortest is zero.','Use bestT=-(direction\' *particular)/(direction\' *direction).']),
 task('resolve-identifiability','Check whether a new measurement resolves ambiguity','Transfer',r=>{const A=under(r),n=[A[0][1]*A[1][2]-A[0][2],-A[1][2],1],row=r.pick([A[0].map((v,j)=>v+A[1][j]),[0,0,r.int(1,3)]]);return data({A,direction:n,newRow:[row]},'Append newRow below A into augmented. Store rank(augmented)-rank(A) in rankGain, size(augmented,2)-rank(augmented) in remainingNullity, and augmented*direction in detectedChange. Does the new measurement detect the previously invisible change?');},String.raw`augmented=[A(1,1) A(1,2) A(1,3);A(2,1) A(2,2) A(2,3);newRow(1) newRow(2) newRow(3)];
rankGain=rank(augmented)-rank(A);
remainingNullity=size(augmented,2)-rank(augmented);
detectedChange=augmented*direction;`,[['rankGain','A dependent measurement adds no information.'],['remainingNullity','Subtract rank from the unknown count.'],['detectedChange','Apply every measurement to the old invisible direction.']],['Adding old equations together cannot resolve their ambiguity.','Build a three-row matrix, copying the two original rows and the supplied newRow entries.','Compare ranks and test augmented*direction.']),
],
'laml-lu-pivoting':[
 task('lu-factor-identity','Verify the permutation convention','Warm-up',r=>data({A:pivoted(r)},'Compute [L,U,P]=lu(A). Store P*A in permuted, L*U in rebuilt, and the square root of their total squared entry difference in factorError. This engine uses P*A=L*U.'),String.raw`[L,U,P]=lu(A);
permuted=P*A;
rebuilt=L*U;
factorError=sqrt(sum(sum((permuted-rebuilt).^2)));`,[['P','Record the pivot row swap.'],['permuted','Apply P on the left of A.'],['rebuilt','Multiply the two triangular factors.'],['factorError','Check the entire factorization numerically.']],['The zero first pivot requires a row exchange.','Capture all three lu outputs on their own line.','Compare P*A with L*U.']),
 task('lu-triangular-solve','Solve through a pivoted factorization','Warm-up',r=>{const A=pivoted(r);return data({A,b:mul(A,[r.nonzero(-3,3),r.nonzero(-3,3)])},'Factor A. Store the solution of L*y=P*b in y, the solution of U*x=y in x, and A*x-b in residual. Row swaps must act on the totals too.');},String.raw`[L,U,P]=lu(A);
y=L\(P*b);
x=U\y;
residual=A*x-b;`,[['y','Solve the lower system against permuted totals.'],['x','Complete the upper triangular solve.'],['residual','Check the original equation order.']],['The factors describe P*A.','Apply P to b before solving with L.','Use y=L\\(P*b), then x=U\\y.']),
 task('reuse-lu-two-totals','Reuse elimination for two observations','Apply',r=>{const A=pivoted(r);return data({A,b1:mul(A,[r.int(1,4),r.int(1,4)]),b2:mul(A,[r.int(-4,-1),r.int(1,4)])},'Factor A once, reusing L,U,P for both totals b1 and b2. Store the answers as columns of answers, in that order, and A*answers-[b1 b2] in residuals.');},String.raw`[L,U,P]=lu(A);
y1=L\(P*b1);
y2=L\(P*b2);
x1=U\y1;
x2=U\y2;
answers=[x1 x2];
residuals=A*answers-[b1 b2];`,[['answers','Use two triangular solves for each totals vector.'],['residuals','Verify both outputs against the shared original A.']],['A stays fixed when only b changes.','Apply the same P separately to b1 and b2.','Solve through L then U, and join x1,x2 horizontally.']),
 task('missing-permutation-audit','Expose a forgotten row permutation','Apply',r=>data({A:pivoted(r),b:[r.int(1,4),r.int(6,9)]},'Compute correct by solving L then U with P*b. Compute skipped by doing those solves with b instead. Store norm(A*skipped-b) in skippedResidual and norm(A*correct-b) in correctResidual. This reproduces and diagnoses the omitted-permutation mistake.'),String.raw`[L,U,P]=lu(A);
correct=U\(L\(P*b));
skipped=U\(L\b);
skippedResidual=norm(A*skipped-b);
correctResidual=norm(A*correct-b);`,[['correct','Apply the equation permutation to b.'],['skipped','Reproduce the omitted-permutation calculation.'],['skippedResidual','Measure its error in the original equations.'],['correctResidual','The corrected solve must satisfy the original equations.']],['A row swap changes which total belongs to each equation.','Compare solves with and without P*b.','Use U\\(L\\(P*b)) and U\\(L\\b), then check original residuals.']),
 task('determinant-from-pivots','Recover a determinant from elimination','Transfer',r=>data({A:pivoted(r)},'With [L,U,P]=lu(A), det(L)=1. Store det(P)*prod(diag(U)) in factorDeterminant, det(A) in directDeterminant, and their difference in discrepancy. A row permutation can reverse the determinant sign.'),String.raw`[L,U,P]=lu(A);
factorDeterminant=det(P)*prod(diag(U));
directDeterminant=det(A);
discrepancy=factorDeterminant-directDeterminant;`,[['factorDeterminant','Include row-swap sign.'],['directDeterminant','Compute an independent determinant.'],['discrepancy','The two routes should agree.']],['A triangular determinant is its diagonal product.','Use P*A=L*U and det(L)=1.','Multiply prod(diag(U)) by det(P), which equals its own reciprocal.']),
 task('lu-regularized-fit','Factor a regularized learning system','Transfer',r=>{const B=full(r),h=B[0][0]*B[0][1]+B[1][0]*B[1][1];return data({H:[[B[0][0]**2+B[1][0]**2,h],[h,B[0][1]**2+B[1][1]**2]],lambda:r.int(1,4),rhs:[r.nonzero(-5,5),r.nonzero(-5,5)]},'Form systemMatrix=H+lambda*eye(2), factor it with LU, and solve systemMatrix*weights=rhs through the factors into weights. Store systemMatrix*weights-rhs in residual and weights\' *weights in coefficientEnergy.');},String.raw`systemMatrix=H+lambda*eye(2);
[L,U,P]=lu(systemMatrix);
y=L\(P*rhs);
weights=U\y;
residual=systemMatrix*weights-rhs;
coefficientEnergy=weights'*weights;`,[['systemMatrix','Add lambda only to diagonal entries.'],['weights','Solve through the regularized factors.'],['residual','Check the shifted system.'],['coefficientEnergy','Measure squared coefficient length.']],['eye(2) changes the diagonal only.','Factor the shifted matrix, then permute rhs.','Solve L and U successively, then compute weights\' *weights.']),
],
'laml-orthogonal-qr':[
 task('gram-schmidt-two-columns','Separate overlapping features','Warm-up',r=>data({A:[[r.int(1,3),r.int(1,3)],[r.int(1,3),r.int(1,3)],[0,r.int(1,4)]]},'Perform two-column Gram–Schmidt in original order. Normalize nonzero remainders using their positive lengths. Store the basis in Q, Q\' *A in R, and Q\' *Q in gram.'),gs+"\ngram=Q'*Q;",[['Q','Subtract the first-direction projection before normalizing the second.'],['R','Measure original features in the orthonormal coordinates.'],['gram','Check unit length and perpendicularity.']],['Normalize column 1 into q1.','Remove q1*(q1\' *b) before normalizing column 2.','Build Q=[q1 q2], then R=Q\' *A and gram=Q\' *Q.']),
 task('qr-project-observation','Project an observation onto a feature plane','Warm-up',r=>data({A:plane(r),target:[r.nonzero(-4,4),r.nonzero(-4,4),r.nonzero(-4,4)]},'Compute QR. Keep the first two columns of Q as basis. Store basis*(basis\' *target) in projected, target-projected in residual, and basis\' *residual in perpendicular. Compare projections rather than arbitrary vector signs.'),String.raw`[Q,R]=qr(A);
basis=Q(:,[1 2]);
projected=basis*(basis'*target);
residual=target-projected;
perpendicular=basis'*residual;`,[['projected','Use the orthonormal basis to project.'],['residual','Subtract the projected component.'],['perpendicular','The residual has no coordinate along the feature plane.']],['Full QR can include an extra ambient basis direction.','Retain Q(:,[1 2]), matching the feature columns.','Compute basis*(basis\' *target), then basis\' *residual.']),
 task('least-squares-by-qr','Fit via triangular QR coordinates','Apply',r=>data({A:design(),y:response(r)},'Compute QR, retain Q columns 1,2 and R rows 1,2, then solve the resulting triangular system into beta. Store y-A*beta in residual and residual\' *residual in sse. Avoid forming A\' *A.'),String.raw`[Q,R]=qr(A);
thinQ=Q(:,[1 2]);
thinR=R([1 2],:);
beta=thinR\(thinQ'*y);
residual=y-A*beta;
sse=residual'*residual;`,[['beta','Solve the triangular system with matching thin factors.'],['residual','Check predictions in original observation coordinates.'],['sse','Add squared residuals.']],['Project y into Q coordinates first.','The system is thinR*beta=thinQ\' *y.','Use Q(:,[1 2]), R([1 2],:), then a backslash solve.']),
 task('detect-zero-remainder','Decide whether normalization is valid','Apply',r=>{const a=r.int(1,3),b=r.int(1,3),k=r.nonzero(-3,3),e=r.pick([0,r.int(1,3)]);return data({A:[[a,k*a],[b,k*b],[0,e]]},'Normalize column 1 into q1. Remove its component from column 2, storing leftover and leftoverLength=norm(leftover). Store canNormalize=1 only when leftoverLength>1e-8, otherwise 0. Do not normalize a zero remainder.');},String.raw`a=A(:,1);
b=A(:,2);
q1=a/norm(a);
leftover=b-q1*(q1'*b);
leftoverLength=norm(leftover);
canNormalize=0;
if leftoverLength>1e-8
 canNormalize=1;
end`,[['leftover','Remove parallel information.'],['leftoverLength','Measure the independent part remaining.'],['canNormalize','A near-zero remainder cannot supply a unit direction.']],['The first feature is nonzero.','Dependence leaves a zero remainder, even if the original column is large.','Test norm(b-q1*(q1\' *b))>1e-8.']),
 task('repair-unit-not-orthogonal','Repair the “unit means perpendicular” mistake','Transfer',r=>data({A:[[r.int(1,3),r.int(1,3)],[r.int(1,3),r.int(1,3)],[0,r.int(1,3)]]},'Normalize the two original columns separately and store their dot product in naiveOverlap. Then apply Gram–Schmidt and store q1\' *q2 in repairedOverlap. Store sqrt(sum(sum((A-Q*R).^2))) in reconstructionError. Unit length alone does not remove overlap.'),gs+"\nnaive1=A(:,1)/norm(A(:,1));\nnaive2=A(:,2)/norm(A(:,2));\nnaiveOverlap=naive1'*naive2;\nrepairedOverlap=q1'*q2;\nreconstructionError=sqrt(sum(sum((A-Q*R).^2)));",[['naiveOverlap','Length normalization does not change the angle.'],['repairedOverlap','Subtract overlap before expecting orthogonality.'],['reconstructionError','The repaired factorization must reconstruct A.']],['Dividing by a norm changes length, not direction.','Compute naive and repaired dot products separately.','Use Gram–Schmidt before checking q1\' *q2 and A=Q*R.']),
 task('orthogonal-regression-baseline','Separate a baseline from a trend','Transfer',r=>{const a=r.int(-3,3);return data({t:[a,a+1,a+2,a+3],y:response(r)},'Normalize a ones vector into q0. Remove its component from t into trend and normalize trend into q1. Store centered=y-q0*(q0\' *y), centeredMean=mean(centered), slope=(q1\' *centered)/norm(trend), and intercept=mean(y)-slope*mean(t).');},String.raw`q0=ones(length(t),1)/sqrt(length(t));
trend=t-q0*(q0'*t);
q1=trend/norm(trend);
centered=y-q0*(q0'*y);
centeredMean=mean(centered);
slope=(q1'*centered)/norm(trend);
intercept=mean(y)-slope*mean(t);`,[['centered','Remove only the constant-direction component.'],['centeredMean','A centered response has mean zero.'],['slope','Convert unit-direction coordinates back to input units.'],['intercept','Restore the baseline at original input zero.']],['A unit ones vector represents the intercept direction.','Remove that direction from both t and y.','Divide the q1 coefficient by norm(trend), then recover the intercept from feature means.']),
],
'laml-least-squares':[
 task('fit-noisy-line','Fit noisy observations without forcing an exact answer','Warm-up',r=>data({X:design(),y:response(r)},'Fit X*beta to y. Store beta, residual=y-X*beta, and sse=residual\' *residual. The first design column represents an intercept and the second represents the input.'),String.raw`beta=X\y;
residual=y-X*beta;
sse=residual'*residual;`,[['beta','Fit intercept and slope from all observations.'],['residual','Use observation minus prediction.'],['sse','Square errors before adding them.']],['An inconsistent system has a nonzero best-fit residual.','Use a rectangular backslash solve.','Compute beta=X\\y, residual=y-X*beta, then its dot product with itself.']),
 task('audit-normal-residual','Test whether a proposed fit is optimal','Warm-up',r=>data({X:design(),y:response(r),candidate:[r.int(5,9),r.int(-7,-4)]},'For candidate coefficients, compute residual=y-X*candidate. Store X\' *residual in normalResidual and its norm in gradientHalfLength. Store optimal=1 only if gradientHalfLength<1e-8, otherwise 0. Least-squares optimality requires perpendicular residuals.'),String.raw`residual=y-X*candidate;
normalResidual=X'*residual;
gradientHalfLength=norm(normalResidual);
optimal=0;
if gradientHalfLength<1e-8
 optimal=1;
end`,[['normalResidual','Measure residual components along every design column.'],['gradientHalfLength','Measure the normal residual vector length.'],['optimal','A plausible line is optimal only when all normal residuals vanish.']],['The residual alone need not be zero at an optimum.','Test X\' *residual instead.','Use its norm to classify optimal with a numeric 1 or 0.']),
 task('pythagorean-fit-loss','Predict how much a coefficient perturbation costs','Apply',r=>data({X:design(),y:response(r),delta:[r.nonzero(-2,2),r.nonzero(-2,2)]},'Solve for best=X\\y. Store its squared residual in bestSSE. Perturb coefficients by delta and store that squared residual in perturbedSSE. Store perturbedSSE-bestSSE in extraSSE and delta\' *(X\' *X)*delta in geometricCost. Orthogonal residual geometry makes those last two quantities equal.'),String.raw`best=X\y;
r=y-X*best;
bestSSE=r'*r;
changed=y-X*(best+delta);
perturbedSSE=changed'*changed;
extraSSE=perturbedSSE-bestSSE;
geometricCost=delta'*(X'*X)*delta;`,[['bestSSE','Measure the minimum squared residual.'],['perturbedSSE','Recompute predictions after changing coefficients.'],['extraSSE','Subtract the optimum error from the perturbed error.'],['geometricCost','Measure the squared prediction displacement caused by delta.']],['At the optimum, residual is perpendicular to every prediction change.', 'The cross term in squared error therefore vanishes.', 'Compare the SSE increase with norm(X*delta)^2, equivalently delta\' *(X\' *X)*delta.']),
 task('weighted-observations','Fit observations with unequal reliability','Apply',r=>data({X:design(),y:response(r),weights:[r.int(1,4),r.int(1,4),r.int(1,4),r.int(1,4)]},'Positive weights express observation reliability. Form W=diag(sqrt(weights)), solve (W*X)*beta=W*y into beta, and store residual=y-X*beta. Store sum(weights.*(residual.^2)) in weightedSSE and X\' *(weights.*residual) in weightedNormal. Scale equations by square roots, not weights themselves.'),String.raw`W=diag(sqrt(weights));
beta=(W*X)\(W*y);
residual=y-X*beta;
weightedSSE=sum(weights.*(residual.^2));
weightedNormal=X'*(weights.*residual);`,[['beta','Scale each equation by the square root of its reliability.'],['weightedSSE','Multiply squared residuals by their observation weights.'],['weightedNormal','The weighted residual must satisfy weighted normal equations.']],['Squared error already squares each row scale.','Use sqrt(weights) before fitting.','Solve (W*X)\\(W*y), then inspect X\' *(weights.*residual).']),
 task('dependent-design-predictions','Fit a design with nonunique coefficients','Transfer',r=>{const t=[1,2,3,4],k=r.int(2,5);return data({X:t.map(v=>[v,k*v]),y:response(r)},'X has dependent columns. Use pinv(X)*y to obtain one minimum-length beta. Store rank(X) in designRank, X*beta in fitted, and sum((y-fitted).^2) in sse. The checks assess predictions rather than a claim that these coefficients are unique.');},String.raw`designRank=rank(X);
beta=pinv(X)*y;
fitted=X*beta;
sse=sum((y-fitted).^2);`,[['designRank','Recognize dependence despite having two feature names.'],['fitted','Use a pseudoinverse fit in the available column span.'],['sse','Measure the residual that dependence cannot explain.']],['Both columns point along the same observation direction.','A pseudoinverse supplies a convenient minimum-length fit.','Compute beta=pinv(X)*y, then fitted=X*beta.']),
 task('two-response-regression','Fit two measured outcomes with one design','Transfer',r=>data({X:design(),y1:response(r),y2:response(r)},'Fit y1 and y2 separately against the same X. Store their coefficient vectors as columns of models and predictions as columns of predictions. Store the two squared residual totals in an explicitly written row sseByOutput=[sse1 sse2].'),String.raw`beta1=X\y1;
beta2=X\y2;
models=[beta1 beta2];
predictions=X*models;
r1=y1-X*beta1;
r2=y2-X*beta2;
sse1=r1'*r1;
sse2=r2'*r2;
sseByOutput=[sse1 sse2];`,[['models','Fit each outcome with its own coefficients.'],['predictions','Preserve response column order.'],['sseByOutput','Keep the squared error totals separate by outcome.']],['The design can be shared while coefficient vectors differ.','Use one solve per response.', 'Join the models horizontally and calculate one residual dot product for each outcome.']),
],
'laml-regression-validation':[
 task('held-out-intercept-fit','Learn an intercept and evaluate held-out inputs','Warm-up',r=>{const a=r.nonzero(-4,4),b=r.nonzero(-3,3),e=r.int(1,3);return data({trainX:[0,1,2,3],trainY:[a,a+b,a+2*b,a+3*b],testX:[4,5],testY:[a+4*b+e,a+5*b-e]},'Build training and test designs with a ones column followed by the input. Store training coefficients in beta, held-out predictions in predictions, and mean((testY-predictions).^2) in mse. Test outputs never enter the fit.');},String.raw`trainDesign=[ones(length(trainX),1) trainX];
testDesign=[ones(length(testX),1) testX];
beta=trainDesign\trainY;
predictions=testDesign*beta;
mse=mean((testY-predictions).^2);`,[['beta','Fit only training outputs, with an intercept.'],['predictions','Apply frozen coefficients to held-out inputs.'],['mse','Average squared held-out errors.']],['A ones column represents the baseline.','Solve trainDesign\\trainY, excluding testY.','Predict with the same test feature order and average squared errors.']),
 task('intercept-omission-audit','Measure the bias from omitting a baseline','Warm-up',r=>{const a=r.nonzero(2,5),b=r.nonzero(-3,3);return data({x:[1,2,3,4],y:[a+b,a+2*b,a+3*b,a+4*b]},'Fit y with [ones(length(x),1) x] into withIntercept, and fit x alone into throughOrigin. Store their training squared errors in flexibleSSE and forcedSSE. Omitting the intercept forces the prediction at input zero to zero.');},String.raw`X=[ones(length(x),1) x];
withIntercept=X\y;
throughOrigin=x\y;
flexibleSSE=sum((y-X*withIntercept).^2);
forcedSSE=sum((y-x*throughOrigin).^2);`,[['withIntercept','Fit both baseline and slope.'],['throughOrigin','Fit the restricted one-parameter model.'],['flexibleSSE','Evaluate the model with its intercept feature.'],['forcedSSE','Evaluate the forced-zero-baseline model.']],['Two models have different feature spaces.','One includes ones, the other only x.','Fit and evaluate both using their own design matrices.']),
 task('training-only-centering','Center new inputs using training statistics','Apply',r=>{const shift=r.int(3,9),a=r.nonzero(-4,4),b=r.nonzero(-3,3),tx=[shift,shift+1,shift+2,shift+3];return data({trainX:tx,trainY:tx.map(v=>a+b*v),testX:[shift+5,shift+7]},'Compute trainMean=mean(trainX). Build an intercept plus centered-input training design. Fit beta in those coordinates. Store testCentered=testX-trainMean and predictions from the identically centered test design. Never subtract the test set mean.');},String.raw`trainMean=mean(trainX);
trainCentered=trainX-trainMean;
trainDesign=[ones(length(trainX),1) trainCentered];
beta=trainDesign\trainY;
testCentered=testX-trainMean;
testDesign=[ones(length(testX),1) testCentered];
predictions=testDesign*beta;`,[['trainMean','Estimate preprocessing from training rows only.'],['beta','Fit in the centered training coordinate system.'],['testCentered','Reuse the training mean for new inputs.'],['predictions','Apply the same feature transformation before prediction.']],['The coordinate origin is learned from training data.','Keep trainMean fixed when transforming testX.','Use trainX-trainMean and testX-trainMean in their respective designs.']),
 task('label-leakage-audit','Repair a model trained on test labels','Apply',r=>{const a=r.nonzero(-3,3),b=r.nonzero(-2,2),e=r.int(3,7);return data({trainX:[0,1,2],trainY:[a,a+b,a+2*b],testX:[3,4],testY:[a+3*b+e,a+4*b+e]},'A leaked model uses both training and test labels. Compute that model into leakedBeta from the combined five observations. Refit only training data into cleanBeta. Store norm(leakedBeta-cleanBeta) in leakageGap and clean test mean squared error in honestMSE.');},String.raw`allX=[trainX;testX];
allY=[trainY;testY];
allDesign=[ones(length(allX),1) allX];
leakedBeta=allDesign\allY;
trainDesign=[ones(length(trainX),1) trainX];
cleanBeta=trainDesign\trainY;
leakageGap=norm(leakedBeta-cleanBeta);
testDesign=[ones(length(testX),1) testX];
honestMSE=mean((testY-testDesign*cleanBeta).^2);`,[['leakedBeta','Reproduce the specific inclusion of test labels.'],['cleanBeta','Fit the corrected rule using training observations only.'],['leakageGap','Measure how test labels distorted the learned coefficients.'],['honestMSE','Evaluate held-out labels using the clean model.']],['Training on test labels changes the rule being evaluated.','Fit the combined model only to expose the mistake.','Refit the clean model on trainX,trainY and evaluate it without refitting.']),
 task('feature-order-contract','Repair reversed feature columns at prediction time','Transfer',r=>{const a=r.nonzero(-3,3),b=r.nonzero(-3,3),c=r.nonzero(-3,3),base=[[0,0],[1,0],[0,1],[1,1]];return data({trainFeatures:base,trainY:base.map(([u,v])=>a+b*u+c*v),testReversed:[[r.int(2,4),r.int(-4,-2)],[r.int(-4,-2),r.int(2,4)]]},'Training feature columns are [feature1 feature2]. Test rows arrived as [feature2 feature1] in testReversed. Fit beta using an intercept and training columns. Store correctly reordered testDesign, including the intercept first, and its predictions. Shape compatibility alone cannot detect swapped meanings.');},String.raw`trainDesign=[ones(size(trainFeatures,1),1) trainFeatures];
beta=trainDesign\trainY;
first=testReversed(:,2);
second=testReversed(:,1);
testDesign=[ones(size(testReversed,1),1) first second];
predictions=testDesign*beta;`,[['beta','Maintain intercept, feature1, feature2 order when fitting.'],['testDesign','Reverse the two incoming feature columns before prediction.'],['predictions','Match feature meanings rather than only matrix dimensions.']],['Both feature orders have valid dimensions, but different meanings.','Test column 2 is feature1; test column 1 is feature2.','Build testDesign=[ones(...) first second] in the training order.']),
 task('chronological-drift-audit','Detect bias after a chronological split','Transfer',r=>{const a=r.nonzero(-3,3),b=r.nonzero(-3,3),e=r.nonzero(-3,3);return data({trainX:[1,2,3,4],trainY:[a+b,a+2*b,a+3*b,a+4*b],testX:[5,6,7],testY:[a+5*b+e,a+6*b+2*e,a+7*b+3*e]},'Fit an intercept and slope to earlier training observations. Store later test errors testY-predictions in testErrors, their mean in meanBias, test MSE in mse, and training MSE in trainMSE. Signed mean error exposes systematic drift that zero training error misses.');},String.raw`trainDesign=[ones(length(trainX),1) trainX];
beta=trainDesign\trainY;
testDesign=[ones(length(testX),1) testX];
predictions=testDesign*beta;
testErrors=testY-predictions;
meanBias=mean(testErrors);
mse=mean(testErrors.^2);
trainMSE=mean((trainY-trainDesign*beta).^2);`,[['testErrors','Keep the signed observation-minus-prediction errors.'],['meanBias','Average signed errors to expose systematic drift.'],['mse','Square before averaging test errors.'],['trainMSE','Evaluate training fit separately.']],['A chronological split can expose future distribution changes.','Freeze coefficients after training.','Compute both mean(testErrors) and mean(testErrors.^2), keeping their meanings distinct.']),
],
'laml-ridge-scaling':[
 task('scaled-ridge-coordinates','Fit ridge in comparable feature units','Warm-up',r=>{const k=r.int(10,100),a=r.nonzero(1,4);return data({X:[[1,k],[2,2*k],[3,3*k]],y:[a,2*a,3*a],lambda:r.int(1,4)},'Compute each feature norm into s1,s2, then scaled columns z1,z2 and Z=[z1 z2]. Solve (Z\' *Z+lambda*eye(2))*gamma=Z\' *y. Store original-unit beta=[gamma(1)/s1;gamma(2)/s2] and predictions=X*beta.');},String.raw`s1=norm(X(:,1));
s2=norm(X(:,2));
z1=X(:,1)/s1;
z2=X(:,2)/s2;
Z=[z1 z2];
gamma=(Z'*Z+lambda*eye(2))\(Z'*y);
beta=[gamma(1)/s1;gamma(2)/s2];
predictions=X*beta;`,[['Z','Divide each feature by its own length.'],['beta','Undo feature scaling after the ridge solve.'],['predictions','Predict using original-unit coefficients.']],['The two columns encode the same direction in different units.','Fit gamma in scaled coordinates with a positive diagonal penalty.','Divide each gamma coefficient by its own feature norm before X*beta.']),
 task('penalty-strength-comparison','Compare weak and strong shrinkage','Warm-up',r=>data({X:[[r.int(1,3),0],[0,r.int(1,3)],[0,0]],y:[r.nonzero(-5,5),r.nonzero(-5,5),r.nonzero(-2,2)],smallPenalty:r.int(1,2),largePenalty:r.int(5,9)},'Fit ridge coefficients betaSmall and betaLarge using smallPenalty and largePenalty. Store norm(betaLarge)/norm(betaSmall) in lengthRatio and each model squared residual total in smallSSE and largeSSE. Use the same unscaled design for both fits.'),String.raw`betaSmall=(X'*X+smallPenalty*eye(2))\(X'*y);
betaLarge=(X'*X+largePenalty*eye(2))\(X'*y);
lengthRatio=norm(betaLarge)/norm(betaSmall);
smallSSE=sum((y-X*betaSmall).^2);
largeSSE=sum((y-X*betaLarge).^2);`,[['betaSmall','Solve using the smaller diagonal penalty.'],['betaLarge','Solve using the larger diagonal penalty.'],['lengthRatio','Compare coefficient lengths on the same feature scale.'],['smallSSE','Evaluate the weaker-penalty fit.'],['largeSSE','Evaluate the stronger-penalty fit.']],['A stronger penalty discourages coefficient length.','Recompute both solves rather than scaling an answer by lambda.','Use X\' *X+penalty*eye(2) separately for each penalty.']),
 task('unpenalized-intercept','Shrink the trend while preserving the baseline','Apply',r=>{const a=r.nonzero(-4,4),b=r.nonzero(-3,3);return data({x:[-3,-1,1,3],y:[a-3*b,a-b,a+b,a+3*b],lambda:r.int(1,5)},'Build X with an intercept followed by x. Use penaltyMatrix=diag([0 1]) so only slope is penalized. Store ridge beta, mean(X*beta) in predictionMean, and beta(1)-mean(y) in baselineError. These centered inputs make the intercept equal the output mean.');},String.raw`X=[ones(length(x),1) x];
penaltyMatrix=diag([0 1]);
beta=(X'*X+lambda*penaltyMatrix)\(X'*y);
predictionMean=mean(X*beta);
baselineError=beta(1)-mean(y);`,[['beta','Leave the intercept diagonal unpenalized.'],['predictionMean','Measure the predicted baseline across centered inputs.'],['baselineError','An unpenalized intercept should preserve the response mean.']],['The first coefficient is the intercept.','Use diag([0 1]) rather than eye(2).','Solve with lambda*penaltyMatrix, then compare beta(1) to mean(y).']),
 task('zero-feature-scaling-guard','Handle an all-zero feature safely','Apply',r=>{const t=[1,2,3],which=r.pick([0,1]),k=r.int(1,4);return data({X:t.map(v=>which?[0,v]:[v,0]),y:t.map(v=>k*v),lambda:r.int(1,3)},'One feature is all zero. Compute its norm but replace any zero scale with 1 before division. Store the two safe scales as safeScales=[s1 s2], fit scaled ridge, and store original-unit beta and predictions. A zero feature contributes no information and must not cause division by zero.');},String.raw`s1=norm(X(:,1));
s2=norm(X(:,2));
if s1==0
 s1=1;
end
if s2==0
 s2=1;
end
safeScales=[s1 s2];
z1=X(:,1)/s1;
z2=X(:,2)/s2;
Z=[z1 z2];
gamma=(Z'*Z+lambda*eye(2))\(Z'*y);
beta=[gamma(1)/s1;gamma(2)/s2];
predictions=X*beta;`,[['safeScales','Replace only zero scales; preserve nonzero feature norms.'],['beta','The uninformative feature should get zero coefficient.'],['predictions','Fit without generating nonfinite numbers.']],['Zero divided by zero is undefined.','A safe scale of 1 leaves a zero column unchanged.','Guard s1,s2 before building Z, then perform the ordinary scaled ridge solve.']),
 task('unit-invariant-penalty','Check invariance when feature units change','Transfer',r=>data({X:[[1,0],[0,2],[1,1]],y:[r.nonzero(-4,4),r.nonzero(-4,4),r.nonzero(-4,4)],unitFactor:r.int(10,100),lambda:r.int(1,4)},'Fit scaled ridge on X, storing original-unit beta in originalBeta. Change only the second feature units by unitFactor and refit using its new feature norms, storing changedBeta. Store the norm of the two prediction vectors difference in predictionGap. Correct scaling should make predictions invariant to this unit change.'),String.raw`s1=norm(X(:,1));
s2=norm(X(:,2));
z1=X(:,1)/s1;
z2=X(:,2)/s2;
Z=[z1 z2];
gamma=(Z'*Z+lambda*eye(2))\(Z'*y);
originalBeta=[gamma(1)/s1;gamma(2)/s2];
changedX=X*diag([1 unitFactor]);
c1=norm(changedX(:,1));
c2=norm(changedX(:,2));
w1=changedX(:,1)/c1;
w2=changedX(:,2)/c2;
changedZ=[w1 w2];
changedGamma=(changedZ'*changedZ+lambda*eye(2))\(changedZ'*y);
changedBeta=[changedGamma(1)/c1;changedGamma(2)/c2];
predictionGap=norm(X*originalBeta-changedX*changedBeta);`,[['originalBeta','Fit with per-feature scaling in original units.'],['changedBeta','Convert the refitted coefficients to the changed units.'],['predictionGap','Compare predictions, not coefficient magnitudes across different units.']],['A unit change scales a feature and inversely scales its coefficient.','Refit in unit-length feature coordinates for both systems.','Undo the respective norms, then compare X*originalBeta with changedX*changedBeta.']),
 task('ridge-as-extra-observations','Express a penalty as extra equations','Transfer',r=>data({X:[[1,0],[0,1],[1,1]],y:[r.nonzero(-4,4),r.nonzero(-4,4),r.nonzero(-4,4)],lambda:r.int(1,5)},'Ridge is ordinary least squares on extra equations sqrt(lambda)*beta=0. Build augmentedX by appending sqrt(lambda)*eye(2) below X and augmentedY by appending two zeros to y. Store its solve in augmentedBeta, the direct ridge solve in directBeta, and the ridge objective squared residual plus lambda times squared coefficient length in objective.'),String.raw`p=sqrt(lambda);
augmentedX=[X(1,1) X(1,2);X(2,1) X(2,2);X(3,1) X(3,2);p 0;0 p];
augmentedY=[y(1);y(2);y(3);0;0];
augmentedBeta=augmentedX\augmentedY;
directBeta=(X'*X+lambda*eye(2))\(X'*y);
residual=y-X*augmentedBeta;
objective=residual'*residual+lambda*(augmentedBeta'*augmentedBeta);`,[['augmentedBeta','Extra equations use sqrt(lambda), not lambda.'],['directBeta','The normal-system ridge solution should match the augmented solve.'],['objective','Include both data fit and coefficient penalty.']],['Squaring the extra-equation residual gives lambda*beta\' *beta.','The appended targets are zero.','Append two diagonal rows of sqrt(lambda), solve, then evaluate the full ridge objective.']),
],
'laml-eigen-iteration':[
 task('eigenpair-invariants','Verify eigenpairs without depending on vector signs','Warm-up',r=>data({A:symmetric(r)},'Compute [Q,D]=eig(A). Store diag(D) in eigenvalues, trace(D) in spectralTrace, det(D) in spectralDeterminant, and sqrt(sum(sum((A*Q-Q*D).^2))) in pairError. Each eigenvalue must stay paired with its eigenvector column.'),String.raw`[Q,D]=eig(A);
eigenvalues=diag(D);
spectralTrace=trace(D);
spectralDeterminant=det(D);
pairError=sqrt(sum(sum((A*Q-Q*D).^2)));`,[['eigenvalues','Read the diagonal eigenvalues.'],['spectralTrace','Add eigenvalues through trace(D).'],['spectralDeterminant','Multiply eigenvalues through det(D).'],['pairError','Check A*Q=Q*D rather than a chosen vector sign.']],['The two eigenvector columns match diagonal entries of D.','Use trace and determinant as independent operator summaries.','Verify the entire eigenpair equation A*Q-Q*D.']),
 task('power-dominant-mode','Estimate a dominant mode by repeated multiplication','Warm-up',r=>{const b=r.int(2,3),a=b+r.int(1,2);return data({A:[[a,b],[b,a]],v:[1,0]},'Perform 35 steps v=A*v followed by v=v/norm(v). Store lambda=v\' *A*v, projector=[v(1)^2 v(1)*v(2);v(1)*v(2) v(2)^2], and eigenResidual=norm(A*v-lambda*v). The projector represents the eigenvector line independently of sign.');},String.raw`for k=1:35
 v=A*v;
 v=v/norm(v);
end
lambda=v'*A*v;
projector=[v(1)^2 v(1)*v(2);v(1)*v(2) v(2)^2];
eigenResidual=norm(A*v-lambda*v);`,[['lambda','Estimate the scale after repeated normalized transformations.'],['projector','Represent the final line without arbitrary sign.'],['eigenResidual','Verify the estimated pair in the original equation.']],['Normalize after every multiplication.','A dominant eigenvalue has larger magnitude than its competitor here.','After the loop use the Rayleigh quotient and compare A*v with lambda*v.']),
 task('audit-proposed-eigenpair','Detect a plausible but invalid eigenpair','Apply',r=>{const A=symmetric(r),valid=r.pick([true,false]),v=valid?[1,1]:[1,0],lambda=A[0][0]+A[0][1]+r.pick([0,valid?0:1]);return data({A,v,claimedLambda:lambda},'A proposed nonzero v claims eigenvalue claimedLambda. Store A*v-claimedLambda*v in mismatch and its norm in residualLength. Store validPair=1 only when residualLength<1e-8, otherwise 0. Matching vector lengths alone would not establish an eigenpair.');},String.raw`mismatch=A*v-claimedLambda*v;
residualLength=norm(mismatch);
validPair=0;
if residualLength<1e-8
 validPair=1;
end`,[['mismatch','Compare vectors, not just their norms.'],['residualLength','Measure the eigenpair equation error.'],['validPair','Both preserved direction and correct scaling are required.']],['An eigenpair obeys A*v=lambda*v exactly.','Subtract the claimed scaled vector from the transformed vector.','Classify validPair from norm(A*v-claimedLambda*v)<1e-8.']),
 task('spectral-repeated-transform','Compare repeated updates with spectral powers','Apply',r=>data({A:symmetric(r),initial:[r.nonzero(-3,3),r.nonzero(-3,3)],steps:r.int(2,5)},'Apply A repeatedly steps times to initial, storing iterative. Separately compute eigenvectors Q and eigenvalues D, raise only the diagonal values to steps, and reconstruct the result into spectralResult. Store norm(iterative-spectralResult) in agreementError.'),String.raw`iterative=initial;
for k=1:steps
 iterative=A*iterative;
end
[Q,D]=eig(A);
powered=diag(diag(D).^steps);
spectralResult=Q*powered*Q'*initial;
agreementError=norm(iterative-spectralResult);`,[['iterative','Apply the supplied transformation the requested number of times.'],['spectralResult','Raise eigenvalues while preserving their eigenvector directions.'],['agreementError','The two descriptions of repeated transformation must agree.']],['Each eigenvector component scales by its eigenvalue at every step.','After steps updates, its scale is eigenvalue^steps.','Use Q*diag(diag(D).^steps)*Q\' *initial and compare with a loop.']),
 task('spectral-gap-diagnostic','Relate convergence to the spectral gap','Transfer',r=>{const a=r.int(4,7),b=r.int(1,3);return data({A:[[a,b],[b,a]],initial:[1,0],steps:r.int(3,8)},'Compute the smaller-to-larger eigenvalue magnitude ratio into contractionRatio. Starting from initial, perform the supplied number of normalized power updates. Store the Rayleigh quotient in estimatedLambda and 1-(dominant\' *v)^2 in directionError, using the eigenvector for the larger eigenvalue. A squared overlap removes sign ambiguity.');},String.raw`[Q,D]=eig(A);
contractionRatio=abs(D(1,1)/D(2,2));
v=initial/norm(initial);
for k=1:steps
 v=A*v;
 v=v/norm(v);
end
estimatedLambda=v'*A*v;
dominant=Q(:,2);
directionError=1-(dominant'*v)^2;`,[['contractionRatio','Compare magnitudes, not their difference alone.'],['estimatedLambda','Measure the final transformed scale.'],['directionError','Use a sign-invariant squared directional overlap.']],['The smaller component shrinks relatively by the eigenvalue ratio.','Use the larger second eigenvalue for this positive symmetric example.','Compute 1-(Q(:,2)\' *v)^2 after normalized power steps.']),
 task('spectral-direction-filter','Filter a signal onto its dominant mode','Transfer',r=>data({A:symmetric(r),signal:[r.nonzero(-5,5),r.nonzero(-5,5)]},'Compute eigenvectors Q. Keep only the direction of the larger second eigenvalue using projector=Q*diag([0 1])*Q\'. Store filtered=projector*signal, removed=signal-filtered, and filtered\' *removed in orthogonality. This operation preserves a line, not every signal length.'),String.raw`[Q,D]=eig(A);
projector=Q*diag([0 1])*Q';
filtered=projector*signal;
removed=signal-filtered;
orthogonality=filtered'*removed;`,[['filtered','Keep the leading spectral direction of the supplied signal.'],['removed','Subtract retained information from the original signal.'],['orthogonality','Kept and removed perpendicular modes should have zero dot product.']],['A projector keeps selected coordinates in an orthonormal basis.','Set the smaller eigenvalue coordinate mask to zero and the larger to one.','Use Q*diag([0 1])*Q\' before multiplying signal.']),
],
'laml-symmetric-quadratic':[
 task('orthogonal-diagonalization','Reconstruct a symmetric operator','Warm-up',r=>data({H:symmetric(r)},'Compute [Q,D]=eig(H). Store diag(D) in eigenvalues, Q\' *Q in gram, Q*D*Q\' in reconstructed, and the square root of total squared entries of H-reconstructed in reconstructionError. Check operator behavior independently of eigenvector signs.'),String.raw`[Q,D]=eig(H);
eigenvalues=diag(D);
gram=Q'*Q;
reconstructed=Q*D*Q';
reconstructionError=sqrt(sum(sum((H-reconstructed).^2)));`,[['eigenvalues','Preserve matching diagonal eigenvalues.'],['gram','Symmetric eigenvectors should form perpendicular unit directions.'],['reconstructed','Transform the diagonal operator back into original coordinates.'],['reconstructionError','Compare every reconstructed matrix entry.']],['Real symmetric matrices admit an orthonormal eigenbasis.','The inverse change of basis is Q transpose.','Use Q*D*Q\' and verify Q\' *Q separately.']),
 task('quadratic-coordinate-energy','Measure energy in two coordinate systems','Warm-up',r=>data({H:symmetric(r),x:[r.nonzero(-4,4),r.nonzero(-4,4)]},'Compute energy=x\' *H*x. Change to eigenvector coordinates z=Q\' *x. Store each weighted squared coordinate in contributions=diag(D).*(z.^2), and their sum in diagonalEnergy. Squared coordinates make contributions independent of eigenvector signs.'),String.raw`[Q,D]=eig(H);
energy=x'*H*x;
z=Q'*x;
contributions=diag(D).*(z.^2);
diagonalEnergy=sum(contributions);`,[['energy','Use the supplied original coordinates in H.'],['contributions','Weight each squared eigen-coordinate by its matching eigenvalue.'],['diagonalEnergy','Changing orthonormal coordinates must preserve energy.']],['Eigenvector coordinates remove mixed quadratic terms.','Compute z=Q\' *x before using D.','Multiply diag(D) by z.^2 element by element, then sum.']),
 task('curvature-classification','Detect positive, flat, and negative curvature','Apply',r=>{const lo=r.pick([-r.int(1,3),0,r.int(1,3)]),hi=r.int(4,7);return data({H:[[(hi+lo)/2,(hi-lo)/2],[(hi-lo)/2,(hi+lo)/2]]},'Compute the smallest eigenvalue into minimumCurvature and det(H) into determinant. Store classification=1 if minimumCurvature>1e-8, -1 if it is below -1e-8, and 0 otherwise. These mean positive definite, a negative-energy direction exists, and a flat boundary respectively.');},String.raw`[Q,D]=eig(H);
minimumCurvature=min(diag(D));
determinant=det(H);
classification=0;
if minimumCurvature>1e-8
 classification=1;
end
if minimumCurvature<-1e-8
 classification=-1;
end`,[['minimumCurvature','Inspect the weakest signed eigenvalue.'],['determinant','Compute an independent operator diagnostic.'],['classification','Distinguish positive, negative, and zero minimum curvature.']],['A determinant alone does not identify all eigenvalue signs.','Inspect min(diag(D)).','Use separate positive and negative threshold tests around zero.']),
 task('newton-quadratic-repair','Repair a learning state using curvature','Apply',r=>data({H:symmetric(r),b:[r.nonzero(-5,5),r.nonzero(-5,5)],x:[r.int(5,8),r.int(-8,-5)]},'The loss is 0.5*x\' *H*x-b\' *x. Store gradient=H*x-b. Solve H*step=gradient, then updated=x-step. Store H*updated-b in optimumResidual and the loss decrease in lossDrop. Positive definite curvature makes this one Newton step exact.'),String.raw`gradient=H*x-b;
step=H\gradient;
updated=x-step;
optimumResidual=H*updated-b;
before=0.5*x'*H*x-b'*x;
after=0.5*updated'*H*updated-b'*updated;
lossDrop=before-after;`,[['gradient','Subtract the linear-loss vector b from H*x.'],['updated','Solve a curvature-weighted correction rather than subtracting the raw gradient.'],['optimumResidual','The updated point should satisfy H*x=b.'],['lossDrop','Evaluate the same quadratic objective before and after.']],['The gradient is H*x-b for symmetric H.','Newton correction solves H*step=gradient.','Use updated=x-H\\gradient, then compare objective values.']),
 task('energy-eigenvalue-bounds','Bound energy without assuming a preferred direction','Transfer',r=>data({H:symmetric(r),x:[r.nonzero(-5,5),r.nonzero(-5,5)]},'Store lower=min(diag(D)) and upper=max(diag(D)) from eig(H). Store normalizedEnergy=(x\' *H*x)/(x\' *x). Store its distances above lower and below upper as lowerSlack and upperSlack. The nonzero supplied x makes this quotient defined.'),String.raw`[Q,D]=eig(H);
lower=min(diag(D));
upper=max(diag(D));
normalizedEnergy=(x'*H*x)/(x'*x);
lowerSlack=normalizedEnergy-lower;
upperSlack=upper-normalizedEnergy;`,[['lower','Use the smallest eigenvalue as the lower unit-energy bound.'],['upper','Use the largest eigenvalue as the upper bound.'],['normalizedEnergy','Divide quadratic energy by squared vector length.'],['lowerSlack','Compare the quotient with the lower bound.'],['upperSlack','Compare the quotient with the upper bound.']],['Unit-length eigenvectors attain the extremal energies.','Normalize energy by x\' *x, not norm(x).','Subtract lower from normalizedEnergy and normalizedEnergy from upper.']),
 task('whitened-energy-coordinates','Turn a quadratic metric into ordinary squared length','Transfer',r=>data({H:symmetric(r),x:[r.nonzero(-4,4),r.nonzero(-4,4)]},'H is positive definite. Compute z=Q\' *x and whitened=diag(sqrt(diag(D)))*z. Store whitened\' *whitened in transformedEnergy, recover x into recovered using inverse square-root scales and Q, and store norm(recovered-x) in recoveryError. Check the energy-preserving metric transformation.'),String.raw`[Q,D]=eig(H);
z=Q'*x;
roots=sqrt(diag(D));
whitened=diag(roots)*z;
transformedEnergy=whitened'*whitened;
inverseRoots=1./roots;
recovered=Q*diag(inverseRoots)*whitened;
recoveryError=norm(recovered-x);`,[['transformedEnergy','Square-root eigenvalue scales turn the quadratic form into squared length.'],['recovered','Undo the scales and then change back with Q.'],['recoveryError','The invertible metric transformation must recover x.']],['Positive eigenvalues have nonzero real square roots.','Multiply z by those roots before taking squared length.','Recover using Q*diag(1./sqrt(diag(D)))*whitened.']),
],
'laml-covariance-pca':[
 task('center-and-covary','Compute separate feature statistics','Warm-up',r=>data({X:cloud(r)},'Compute one feature mean per column into mu=[mean(X(:,1)) mean(X(:,2))]. Store centered rows in C, the two centered feature means in centeredMeans, and sample covariance C\' *C/(n-1) in covariance. In OpenMat, mean(X) alone would average the entire array.'),center+"\ncenteredMeans=[mean(C(:,1)) mean(C(:,2))];",[['mu','Use separate feature means.'],['C','Subtract the repeated mean row.'],['centeredMeans','Each centered feature should have mean zero.'],['covariance','Use centered products with sample denominator n-1.']],['Observations are rows and features are columns.','Repeat mu once per observation with repmat.','Compute C=X-repmat(mu,n,1), then covariance=C\' *C/(n-1).']),
 task('one-component-reconstruction','Keep the dominant data direction','Warm-up',r=>data({X:cloud(r)},'Center X, form sample covariance, and compute eig. In these datasets the larger eigenvalue is second. Store projector=Q*diag([0 1])*Q\', ratio=D(2,2)/trace(D), reconstructed=C*projector+repmat(mu,n,1), and total squared reconstruction error in squaredError.'),center+String.raw`
[Q,D]=eig(covariance);
projector=Q*diag([0 1])*Q';
ratio=D(2,2)/trace(D);
reconstructed=C*projector+repmat(mu,n,1);
squaredError=sum(sum((X-reconstructed).^2));`,[['ratio','Divide retained variance by total variance.'],['reconstructed','Project centered rows, then restore feature means.'],['squaredError','Measure information lost across all entries.']],['Center before covariance and restore means after projection.','The projection mask keeps only the larger second eigenvalue direction.','Use Q*diag([0 1])*Q\' and compare X with the resulting reconstruction.']),
 task('translation-invariance','Verify covariance survives a change of origin','Apply',r=>data({X:cloud(r),offset:[[r.nonzero(-5,5),r.nonzero(-5,5)]]},'Translate every feature row by offset. Store the original covariance in covariance and the translated covariance in shiftedCovariance, using separate feature means each time. Store shiftedMean-mu in meanShift and the square root of total squared covariance differences in covarianceGap. Centering should remove translation.'),center+String.raw`
shifted=X+repmat(offset,n,1);
shiftedMean=[mean(shifted(:,1)) mean(shifted(:,2))];
shiftedC=shifted-repmat(shiftedMean,n,1);
shiftedCovariance=shiftedC'*shiftedC/(n-1);
meanShift=shiftedMean-mu;
covarianceGap=sqrt(sum(sum((shiftedCovariance-covariance).^2)));`,[['covariance','Compute original centered covariance.'],['shiftedCovariance','Recenter the translated data using its own feature means.'],['meanShift','Feature means should move by the supplied offset.'],['covarianceGap','Centered variation should be translation invariant.']],['Translation moves means, not deviations from the means.','Compute the shifted feature means separately.','Compare the two centered covariance matrices and shiftedMean-mu.']),
 task('unit-sensitive-pca','Audit PCA after changing feature units','Apply',r=>data({X:cloud(r),unitFactor:r.int(3,10)},'Compute original centered covariance and its leading projector P. Rescale feature 2 by unitFactor, recenter, and compute leading projector changedP. Store ratio of original retained variance in originalRatio, the changed variance ratio in changedRatio, and trace(P*changedP) in directionAgreement. This squared directional overlap detects PCA sensitivity to units.'),center+String.raw`
[Q,D]=eig(covariance);
P=Q*diag([0 1])*Q';
originalRatio=D(2,2)/trace(D);
changed=X*diag([1 unitFactor]);
changedMu=[mean(changed(:,1)) mean(changed(:,2))];
changedC=changed-repmat(changedMu,n,1);
changedCovariance=changedC'*changedC/(n-1);
[changedQ,changedD]=eig(changedCovariance);
changedP=changedQ*diag([0 1])*changedQ';
changedRatio=changedD(2,2)/trace(changedD);
directionAgreement=trace(P*changedP);`,[['originalRatio','Measure retained variance in the original units.'],['changedRatio','Recompute rather than reuse the original covariance.'],['directionAgreement','Compare component lines independently of sign.']],['Centering removes origin choices but does not remove unit choices.','Scale only feature 2 and recompute its covariance.','Build both rank-one projectors, then evaluate trace(P*changedP).']),
 task('held-out-pca-transform','Apply training PCA to held-out observations','Transfer',r=>data({X:cloud(r),test:[[r.int(-9,9),r.int(-9,9)],[r.int(-9,9),r.int(-9,9)]]},'Learn feature means and the leading PCA projector from training X only. Store the learned mu in trainingMean. Center held-out test with that mean, reconstruct with the fixed projector, and restore the mean into reconstructedTest. Store total squared held-out reconstruction error in testSquaredError. Do not fit or recenter PCA on test.'),center+String.raw`
[Q,D]=eig(covariance);
projector=Q*diag([0 1])*Q';
trainingMean=mu;
testCentered=test-repmat(trainingMean,size(test,1),1);
reconstructedTest=testCentered*projector+repmat(trainingMean,size(test,1),1);
testSquaredError=sum(sum((test-reconstructedTest).^2));`,[['trainingMean','Learn preprocessing from training X only.'],['reconstructedTest','Reuse both the training mean and component direction.'],['testSquaredError','Evaluate held-out reconstruction across all features.']],['PCA is a learned transformation, even without labels.','Freeze mu and projector before looking at test rows.','Subtract and restore trainingMean around testCentered*projector.']),
 task('variance-budget-components','Choose how many components meet a variance budget','Transfer',r=>data({X:cloud(r),targetRatio:r.pick([0.7,0.85,0.95,0.99])},'Choose one component if its leading variance ratio meets targetRatio; otherwise retain both. Store the numeric count in keptComponents, retained variance fraction in retainedRatio, original-coordinate reconstruction in reconstructed, and total squared entry loss in squaredError. Use the smallest count meeting the budget.'),center+String.raw`
[Q,D]=eig(covariance);
leadingRatio=D(2,2)/trace(D);
keptComponents=2;
mask=eye(2);
retainedRatio=1;
if leadingRatio>=targetRatio
 keptComponents=1;
 mask=diag([0 1]);
 retainedRatio=leadingRatio;
end
projector=Q*mask*Q';
reconstructed=C*projector+repmat(mu,n,1);
squaredError=sum(sum((X-reconstructed).^2));`,[['keptComponents','Retain the minimum count meeting the supplied threshold.'],['retainedRatio','Report retained variance for the selected count.'],['reconstructed','Use the selected component mask, then restore means.'],['squaredError','Measure loss for the actually selected reconstruction.']],['Compare the one-component fraction with the target.', 'If one is insufficient, keeping both retains all variance.', 'Choose diag([0 1]) or eye(2), then reconstruct using the chosen mask.']),
],
}

