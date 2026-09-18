Flow 描述空间如何随时间变形，Velocity Field 描述此刻的局部运动规则，CNF 则让这套连续动力学能够从数据中学习。

本文沿着「空间变换 → 速度场 → 概率分布 → CNF 训练」展开。先理解每一个点如何运动，再理解所有点构成的分布如何变化，最后看终点密度的损失怎样反过来训练速度网络。

## 01 · Flow：空间如何随时间连续变形

Flow 是由时间依赖速度场生成的一族平滑、可逆的空间变换。它描述每一个点如何连续运动，并通过 push-forward 同时描述整个概率分布如何随时间演化。

如果随机变量 $X_0$ 服从初始分布 $p_0$，那么经过 Flow 后：

$$X_t=\psi_t(X_0),\qquad p_t=(\psi_t)_\#p_0$$

所以 Flow 可以同时从两个角度理解：

- **粒子角度**：每一个点 $x_0$ 被移动到 $\psi_t(x_0)$。
- **分布角度**：整个概率分布 $p_0$ 被连续运输成 $p_t$。

这里统一用 $(\psi_t)_\#p_0$ 表示原稿中的 $\psi_t(p_0)$，强调它是对分布的推送，而不是把密度数值直接代入空间映射。

### 随机变量与概率分布

设一个随机变量 $X\in\mathbb R^d$，它服从某个概率分布 $X\sim p_X$。在存在密度的情况下，真正有意义的是某个区域 $A$ 中的概率：

$$\mathbb P(X\in A)=\int_A p_X(x)dx$$

概率密度 $p_X(x)$ 可以理解为：**在位置 $x$ 附近，概率质量有多密集。** Flow 会不断移动空间中的点，而空间的拉伸与压缩会导致概率密度发生变化。

### 空间映射与 Push-forward

考虑一个普通映射：

$$Y=\psi(X),\qquad \psi:\mathbb R^d\to\mathbb R^d$$

把原空间中的一个点 $x$ 映射到另一个位置 $\psi(x)$。例如一维情况 $\psi(x)=2x$，就有 $1\to2$、$2\to4$、$3\to6$。

如果 $X$ 是随机变量，那么 $Y=\psi(X)$ 也是随机变量。一个点的变换，同时也会诱导出整个概率分布的变换。若 $X\sim p_X$，新分布记作：

$$p_Y=\psi_\#p_X$$

直观地说，从 $p_X$ 中采样大量点，把每个点通过 $\psi$ 移动到新位置，移动后的所有点共同形成的新分布，就是 $p_Y$。

PUSH-FORWARD

点的映射，诱导出概率分布的变换。

### Jacobian determinant 的意义

假设 $X\sim\mathcal U[0,1]$，并定义 $Y=2X$。原来 $X$ 均匀分布在 $[0,1]$，所有点经过 $y=2x$ 被拉伸到 $[0,2]$。区间长度从 1 变成 2，但总概率仍然必须为 1，所以密度从 1 变成 $1/2$。

**空间被拉伸，概率密度下降；空间被压缩，概率密度上升。**

同样的拉伸也可以作用于高斯分布。下图取 $X_0\sim\mathcal N(0,1)$，观察 $X_t=(1+t)X_0$ 的密度如何变化。

<!-- flow-demo -->



在高维空间中，映射 $y=\psi(x)$ 会改变局部体积。这个局部体积变化由 Jacobian determinant 描述：

$$\left|\det D\psi(x)\right|=\left|\det\frac{\partial\psi}{\partial x}\right|$$

例如 $|\det D\psi(x)|=3$，表示当前位置附近的一个微小体积被放大了 3 倍。为保持概率质量不变，密度缩小到原来的 $1/3$。

因此，对可逆且满足变量替换条件的映射，有下面两个等价形式。

$$p_Y(y)=p_X\left(\psi^{-1}(y)\right)\left|\det D\psi^{-1}(y)\right|,$$

$$p_Y\left(\psi(x)\right)=\frac{p_X(x)}{|\det D\psi(x)|}$$

这就是 **change-of-variables formula**，变量替换公式。

## 02 · Flow 的定义、例子与 Markov 性

Flow 不是一个单独的映射，而是一整族随时间变化的映射：

$$\psi_t:\mathbb R^d\to\mathbb R^d,\qquad t\in[0,1],\qquad \psi_0(x)=x$$

在初始时刻，所有点还停留在原位置。随着时间变化，$\psi_0,\psi_{0.1},\psi_{0.2},\ldots,\psi_1$ 描述空间如何连续变形。

假设初始位置是 $x_0$，那么 $\psi_t(x_0)$ 表示初始时位于 $x_0$ 的粒子，在时间 $t$ 到达的位置。因此定义 $X_t=\psi_t(X_0)$；如果 $X_0$ 是随机变量，那么 $X_t$ 也是随机变量。

### 一个例子：平移与缩放

考虑一维 Flow：

$$\psi_t(x_0)=s_tx_0+m_t$$

其中 $s_t>0$，$s_t,m_t$ 连续可微，并满足 $s_0=1,m_0=0$。它的逆映射是：

$$\psi_t^{-1}(x)=\frac{x-m_t}{s_t}$$

$m_t$ 决定整体平移，$s_t$ 决定空间被放大或缩小多少倍。例如令 $s_t=1+t,m_t=2t$，则：

$$\psi_t(x_0)=(1+t)x_0+2t$$

对于初始位置 $x_0=1$，轨迹为 $x_t=1+3t$，最终到达 $x_1=4$。

如果初始随机变量服从标准高斯 $X_0\sim\mathcal N(0,1)$，则整个分布变成：

$$X_t\sim\mathcal N(m_t,s_t^2)$$

在上述具体例子中：

$$X_t\sim\mathcal N\left(2t,(1+t)^2\right)$$

这里还没有引入速度场，我们已经能够定义 Flow、样本轨迹和概率分布的变化。下面的图先看位置和密度；图中的速度关系将在下一节推出。

<!-- affine-demo -->



### Flow 为什么是 Markov 的

Markov 性表达的是：**给定当前状态以后，未来不再需要更早的历史。**

设 $X_t=\psi_t(X_0)$。现在已经知道 $X_t$，因为 $\psi_t$ 可逆：

$$X_0=\psi_t^{-1}(X_t)$$

对于未来时刻 $s>t$，代入 $X_s=\psi_s(X_0)$：

$$X_s=\psi_s\left(\psi_t^{-1}(X_t)\right)$$

定义 $\Phi_{t,s}=\psi_s\circ\psi_t^{-1}$，那么：

$$X_s=\Phi_{t,s}(X_t)$$

当前状态 $X_t$ 已经包含决定未来所需的全部信息，因此它满足 Markov 性。

- **为什么还是“确定性的” Markov？** 只要当前状态确定为 $X_t=x$，给定当前与未来时刻后，未来就是唯一的 $X_s=\Phi_{t,s}(x)$。
- **随机性到底在哪里？** $X_0$ 是随机抽取的，所以不同初始样本产生不同轨迹 $X_t=\psi_t(X_0)$。



## 03 · Velocity Field：Flow 的局部运动规则



### 从 Flow 提取 Velocity Field

现在处于位置 $x$ 的粒子，最初位于 $x_0=\psi_t^{-1}(x)$。将这个初始位置代入轨迹的时间导数：

$$u_t(x)=\bigl(\partial_t\psi_t\bigr)\left(\psi_t^{-1}(x)\right)$$

这就是速度场。**先固定初始坐标，对 $\psi_t$ 的时间参数求偏导；再在 $\psi_t^{-1}(x)$ 处取值。**

它不是对 $\psi_t(\psi_t^{-1}(x))=x$ 这个复合函数求全导数。后者在固定 $x$ 时恒等于 $x$，其时间导数为零，与速度场的定义不是同一件事。

把当前粒子位置 $x_t=\psi_t(x_0)$ 代入：

$$\begin{aligned}
u_t(x_t)
&=\bigl(\partial_t\psi_t\bigr)\left(\psi_t^{-1}(x_t)\right)\\
&=\partial_t\psi_t(x_0)\\
&=\dot x_t
\end{aligned}$$

于是得到：

$$\frac{dx_t}{dt}=u_t(x_t)$$

这个 ODE 是对既有 Flow 的局部描述。

### Lagrangian 与 Eulerian 两种视角


| 视角               | 固定什么       | 观察什么                                       |
| ---------------- | ---------- | ------------------------------------------ |
| Lagrangian（拉格朗日） | 初始粒子 $x_0$ | 跟随它的轨迹 $\psi_t(x_0)$，速度为 $\dot\psi_t(x_0)$ |
| Eulerian（欧拉）     | 空间位置 $x$   | 时间 $t$ 经过这个位置的粒子应该有多快，即 $u_t(x)$           |


两者用同一个关系连接：$u_t(x)=\dot\psi_t(\psi_t^{-1}(x))$。

## 04 · 速度场的作用：描述运动，也定义 Flow



### 平移与缩放对应什么速度场

对于 $\psi_t(x_0)=s_tx_0+m_t$，有：

$$\partial_t\psi_t(x_0)=\dot s_tx_0+\dot m_t$$

用 $x_0=(x-m_t)/s_t$ 消去初始位置，得到：

$$u_t(x)=\frac{\dot s_t}{s_t}(x-m_t)+\dot m_t$$

其中 $\frac{\dot s_t}{s_t}(x-m_t)$ 负责围绕当前中心 $m_t$ 的膨胀或压缩，$\dot m_t$ 负责整体平移。

当 $s_t=1+t,m_t=2t$ 时：

$$u_t(x)=\frac{x-2t}{1+t}+2=\frac{x+2}{1+t}$$

沿着前面 $x_0=1$ 对应的轨迹 $x_t=1+3t$ 计算速度：

$$u_t(x_t)=\frac{1+3t+2}{1+t}=3=\frac{dx_t}{dt}$$

**速度场不是总位移 $\psi_t(x_0)-x_0$。** 位移描述已经走了多远，速度描述此刻怎样继续运动。

### 从速度场定义 Flow

如果先给定速度场，而没有显式给出 Flow，可以对每个初始位置求解：

$$\frac{dx_t}{dt}=u_t(x_t),\qquad x_{t=0}=x_0$$

等价地：

$$x_t=x_0+\int_0^t u_s(x_s)ds$$

如果这个初值问题对每个起点都有唯一解，就可以定义 $\psi_t(x_0):=x_t$。

**Flow**ψₜ：从起点到当前位置

时间求导与坐标转换 →  
← 求解 ODE

**Velocity Field**uₜ：此刻的局部速度

在适当条件下，它们是同一动力学的两种表示。

## 05 · 良好的 Flow：Diffeomorphism

我们希望空间中的点能够连续移动、平滑变形，不突然撕裂，不把两个不同点硬压成同一个点，并且可以反向恢复原来的位置。

因此考虑特殊映射 $\psi:\mathbb R^d\to\mathbb R^d$，要求它一一对应、可微、逆映射存在且也可微。在相应的连续可微或更高光滑性要求下，这样的映射叫作 **Diffeomorphism（微分同胚）**：一个光滑、可逆，而且逆变换也光滑的空间变形。

可以把一张橡皮膜想象成整个空间。允许平移、拉伸、压缩、弯曲和平滑扭曲，但不能撕开、折断、把两个不同点粘成一个点，或者突然跳跃。

### ODE 解的唯一性为什么重要

考虑 $\frac{dX_t}{dt}=u_t(X_t)$。若速度场对空间满足适当的 Lipschitz 条件、对时间连续，并具有足够的空间光滑性，在所讨论的时间区间内保证正向与反向解存在，那么每个初始点都有唯一轨迹。

假设两个不同起点 $x_0^{(1)}\ne x_0^{(2)}$ 在同一时刻 $t$ 到达相同位置。此时从该位置反向积分，会得到两个不同的过去，与唯一性矛盾。因此：

$$x_0^{(1)}\ne x_0^{(2)}\quad\Longrightarrow\quad
\psi_t(x_0^{(1)})\ne\psi_t(x_0^{(2)})$$

在这些条件下，$\psi_t$ 可逆；若速度场足够光滑，则 $\psi_t$ 和 $\psi_t^{-1}$ 也光滑。

**正则条件的小注**

这里补明原稿略写的前提：局部唯一性不单独保证解在整个时间区间存在，还需排除有限时间爆炸，并保证反向可解。Lipschitz 控制函数值的变化；光滑性涉及导数的存在与连续性，不能简单等同于“限制一阶导变化得多快”。

## 06 · 连续性方程：速度怎样连接概率分布

给定初始分布 $X_0\sim p_0$ 与良好的 Flow $X_t=\psi_t(X_0)$，自然会产生 $p_t=(\psi_t)_\#p_0$。但这个 $p_t$ 不一定是我们想要的。

用 $p_t$ 表示当前速度场实际产生的分布，用 $\rho_t$ 表示希望实现的概率路径。问题是：**什么条件下，$p_t=\rho_t$？**

我们想要的是“生成的数据分布正确”，但能直接控制的是“每个样本怎么移动”。连接这两件事的核心关系，就是 continuity equation，连续性方程。

### 从一维概率守恒推导

在一维中，先设位置 $x$ 处的速度向右。在很短的时间 $\Delta t$ 中，左侧宽度约为 $u_t(x)\Delta t$ 的区间中的概率质量会穿过位置 $x$。这个区间包含的质量近似为 $p_t(x)u_t(x)\Delta t$。

除以时间，得到有符号的概率流量：

$$j_t(x)=p_t(x)u_t(x)$$

密度决定这里有多少概率质量，速度决定这些质量移动得多快；负流量表示向左流动。

现在观察固定区间 $[a,b]$。概率不会凭空产生或消失，所以：

$$\frac{d}{dt}\int_a^b p_t(x)dx=j_t(a)-j_t(b)$$

右边是左端流入减去右端流出。根据微积分基本定理：

$$j_t(a)-j_t(b)=-\int_a^b\partial_xj_t(x)dx$$

在足够光滑的条件下：

$$\int_a^b\left[\partial_tp_t(x)+\partial_xj_t(x)\right]dx=0$$

因为这对任意区间都成立：

$$\boxed{\partial_tp_t(x)+\partial_x\bigl(p_t(x)u_t(x)\bigr)=0}$$

这就是一维连续性方程。下图把刚才的推导画出来：边界左侧的小矩形，宽为 $u_t(x)\Delta t$、高为 $p_t(x)$，面积近似表示穿过边界的概率质量。左端流入减去右端流出，就是区间概率的一阶变化；再除以 $\Delta t$ 并取极限，得到上面的守恒关系。绘图沿用平移与缩放的高斯例子，并取 $a=0,b=2$。

<!-- continuity-demo -->



### 高维连续性方程与散度

高维中，概率可以沿多个方向流动。概率流量是向量 $j_t(x)=p_t(x)u_t(x)$，其散度为：

$$\nabla\cdot j_t=\sum_{k=1}^d\frac{\partial j_{t,k}}{\partial x_k}$$

散度表示一个微小区域单位体积的净向外流量。因此：

$$\boxed{\partial_tp_t+\nabla\cdot(p_tu_t)=0}$$

对任意固定区域 $A$，也可以写成：

$$\frac{d}{dt}\int_A p_t(x)dx
=-\int_{\partial A}p_t(x)u_t(x)\cdot n(x)dS,$$

其中 $n$ 为边界外法向量。净流出为正，区域内总概率质量减少；净流入为正，则增加。局部密度的变化由上面的微分形式给出。

这里要区分 $\nabla\cdot(p_tu_t)$ 和 $\nabla\cdot u_t$：**前者描述概率质量的净流出，后者描述速度场造成的局部体积膨胀或压缩。**

### 生成指定概率路径的判据

模型实际产生的密度满足：

$$\partial_tp_t+\nabla\cdot(p_tu_t)=0,\qquad p_{t=0}=p_0$$

如果指定的目标路径也满足：

$$\partial_t\rho_t+\nabla\cdot(\rho_tu_t)=0,\qquad \rho_0=p_0,$$

并且二者具有相同的边界条件、处于连续性方程解唯一的类别中，那么它们是同一个初值问题的解，即 $p_t=\rho_t$。

在全空间上，需要适当的增长与可积条件，排除概率从无穷远流失；在有边界的区域中，需明确边界通量。

所以，连续性方程是速度场与指定概率路径之间的**兼容条件**。它不是说任意指定的路径，都必然存在满足全部正则条件的速度场。

## 07 · 应用：高斯路径与多样化分布



### 验证平移与缩放生成的高斯路径

考虑速度场 $u_t(x)=\frac{\dot s_t}{s_t}(x-m_t)+\dot m_t$，希望它生成：

$$\rho_t(x)=\frac{1}{s_t\sqrt{2\pi}}\exp\left[-\frac{(x-m_t)^2}{2s_t^2}\right]$$

空间对数密度导数为：

$$\partial_x\log\rho_t=-\frac{x-m_t}{s_t^2}$$

固定位置处的时间导数为：

$$\partial_t\log\rho_t
=-\frac{\dot s_t}{s_t}
+\frac{(x-m_t)\dot m_t}{s_t^2}
+\frac{(x-m_t)^2\dot s_t}{s_t^3}$$

速度场的空间导数为 $\partial_xu_t=\dot s_t/s_t$。将它们代入：

$$\partial_t\log\rho_t+u_t\partial_x\log\rho_t+\partial_xu_t=0,$$

各项恰好抵消。这正是连续性方程除以正密度后的形式，因此该速度场确实生成指定的高斯路径。

也可以直接求解得到 $X_t=s_tX_0+m_t$，再由高斯变量变换得到 $X_t\sim\mathcal N(m_t,s_t^2)$。

### 可逆 Flow 为什么可以生成多样化分布

根据变量替换公式：

$$p_t\left(\psi_t(x_0)\right)=\frac{p_0(x_0)}{|\det D\psi_t(x_0)|}$$

Jacobian 可以随空间位置复杂地变化。某些区域被压缩，形成高密度峰；另一些区域被拉伸，形成低密度区。**形成多个密度峰，不要求把两个不同起点合并。**

一维中可以直接构造。设 $F_0$ 是标准高斯的分布函数，$F_1$ 是一个光滑、处处正密度的双峰高斯混合分布的分布函数，令：

$$T(x)=F_1^{-1}\left(F_0(x)\right)$$

则 $T$ 可以把标准高斯变成目标双峰分布，并且：

$$T'(x)=\frac{p_0(x)}{p_1(T(x))}>0$$

所以它仍然单调、一一可逆。真正受到限制的是精确退化和支持集。

全空间处处正密度的高斯，经过全空间微分同胚后仍然处处具有正密度。它不能在有限的正则时间内精确变成：

- 一个点质量；
- 一个严格集中在低维曲面上的分布；
- 一个在某个开区域内密度严格为零的分布。

可以逼近这些情形，但精确到达通常需要奇异极限或改变模型设定。

## 08 · 从 Flow 与 Velocity Field 到 CNF



### 建模速度场

到目前为止，Flow 和速度场都是数学对象。为了让它们从数据中学习，用带参数 $\theta$ 的神经网络表示速度场 $u_t^\theta(x)$。

网络输入时间 $t$ 和当前位置 $x$，输出与 $x$ 同维度的速度：

$$u^\theta:[0,1]\times\mathbb R^d\longrightarrow\mathbb R^d$$

固定一个容易采样、容易计算密度的初始分布 $X_0\sim p_0=\mathcal N(0,I)$，求解：

$$\frac{dX_t}{dt}=u_t^\theta(X_t),$$

便得到：

$$X_t=\psi_t^\theta(X_0),\qquad p_t^\theta=(\psi_t^\theta)_\#p_0$$

这种模型叫作 **Continuous Normalizing Flow（CNF）**：用连续的、可逆的变换，把简单分布变成复杂分布。具体实现是一个预测速度的神经网络，加上一个 ODE 求解器。

其中 normalizing 指模型具有归一化的概率分布与相应的密度变换关系，并不是对输入做均值方差归一化。

### 训练的到底是什么

通常需要训练的是速度网络的参数 $\theta$：

$$\theta\longrightarrow u_t^\theta\longrightarrow\psi_t^\theta\longrightarrow p_1^\theta$$

改变参数，就会改变速度场；速度场改变，轨迹随之改变；所有轨迹的变化，又会改变终点分布。

初始分布一般预先固定，轨迹由 ODE 求解器产生，密度通过轨迹与体积变化计算得到。因此 CNF 通常不需要为每个样本单独学习一条轨迹，也不需要额外训练一个直接输出终点密度的网络。

**CNF 是模型形式，最大似然是传统训练方式之一。Flow Matching 也可以学习这类模型的速度场。**

## 09 · 瞬时变量替换：沿轨迹计算密度

速度网络直接输出的是速度，但传统最大似然训练需要计算概率密度，因此要把速度与密度联系起来。以下补全原稿第 9–10 页空白处的公式，沿用其「连续性方程 → 链式法则 → 积分」顺序。

### 从连续性方程出发

连续性方程为 $\partial_tp_t=-\nabla\cdot(p_tu_t)$。展开乘积：

$$\partial_tp_t=-u_t^\top\nabla p_t-p_t\nabla\cdot u_t$$

在 $p_t>0$ 的位置，两边除以 $p_t$：

$$\partial_t\log p_t=-u_t^\top\nabla\log p_t-\nabla\cdot u_t$$

这描述**固定空间位置**处对数密度随时间的变化。

现在跟随运动中的样本 $X_t$ 观察。密度函数和样本位置都随时间改变，由全微分链式法则：

$$\frac{d}{dt}\log p_t(X_t)
=\partial_t\log p_t(X_t)
+\nabla\log p_t(X_t)^\top\frac{dX_t}{dt}$$

代入 ODE 运动方程 $dX_t/dt=u_t(X_t)$，空间对流项恰好抵消：

$$\boxed{\frac{d}{dt}\log p_t(X_t)=-\nabla\cdot u_t(X_t)}$$

这就是 **Instantaneous Change of Variables，瞬时变量替换公式**：沿着样本轨迹观测时，对数密度的时间变化率，等于速度场局部散度的负值，也就是局部对数体积膨胀率的相反数。

对时间从 0 到 1 积分，得到 CNF 的对数似然：

$$\log p_1^\theta(X_1)=\log p_0(X_0)
-\int_0^1\nabla\cdot u_t^\theta(X_t)dt$$

### 瞬时公式与 Jacobian 的关系

令 $J_t=D\psi_t(x_0)$。在足够光滑的条件下，对 Flow 的 ODE 再关于初始位置求导：

$$\frac{dJ_t}{dt}=Du_t(X_t)J_t,\qquad J_0=I$$

由行列式的微分公式：

$$\begin{aligned}
\frac{d}{dt}\log|\det J_t|
&=\operatorname{tr}\left(J_t^{-1}\frac{dJ_t}{dt}\right)\\
&=\operatorname{tr}\bigl(Du_t(X_t)\bigr)\\
&=\nabla\cdot u_t(X_t)
\end{aligned}$$

另一方面，概率守恒要求：

$$p_t(X_t)|\det J_t|=p_0(x_0)$$

所以：

$$\frac{d}{dt}\log p_t(X_t)
=-\frac{d}{dt}\log|\det J_t|
=-\nabla\cdot u_t(X_t)$$

普通变量替换中的 Jacobian 行列式，与瞬时变量替换中的散度，描述的是同一个体积变化：**前者描述累计变化，后者描述每一瞬间的变化率。**

在平移与缩放的例子中，$J_t=s_t$、$\partial_xu_t=\dot s_t/s_t$，因此：

$$\log p_t(X_t)=\log p_0(X_0)-\log s_t$$

空间长度扩大 $s_t$ 倍，沿轨迹的密度就缩小为原来的 $1/s_t$。

## 10 · CNF 具体训练：用终点密度间接学习速度

### 为什么可以用最大似然训练

设真实数据分布为 $q$，模型终点分布为 $p_1^\theta$。希望两者接近，可以最小化 $D_{\mathrm{KL}}(q\|p_1^\theta)$。在相关密度与期望有定义的条件下：

$$\begin{aligned}
D_{\mathrm{KL}}(q\|p_1^\theta)
&=\mathbb E_{Y\sim q}\left[\log q(Y)-\log p_1^\theta(Y)\right]\\
&=\underbrace{\mathbb E_q[\log q(Y)]}_{\text{与参数无关}}
-\mathbb E_q[\log p_1^\theta(Y)]
\end{aligned}$$

因此，最小化 KL 等价于最小化负对数似然：

$$\mathcal L(\theta)=-\mathbb E_{Y\sim q}\log p_1^\theta(Y)$$

不需要知道 $q$ 的完整公式，只需要能够获得真实样本。对一个 batch $\{y_i\}_{i=1}^B$，使用样本平均：

$$\widehat{\mathcal L}(\theta)=-\frac1B\sum_{i=1}^B\log p_1^\theta(y_i)$$

这里的 KL 推导针对真实总体分布。有限数据集形成的是离散经验分布，不能直接把它与连续模型之间的 KL 当成有限的密度积分；实践中使用的是样本平均负对数似然。

当模型能够表达真实分布，并且优化达到总体目标的全局最优时，KL 可以达到零。现实中的有限数据、有限模型和不完全优化，通常只能得到近似匹配。

### 一次训练迭代具体做什么

首先取一条真实数据 $y$，把它视为终点 $X_1=y$。使用当前速度网络，从 $t=1$ 反向积分到 $t=0$：

$$\frac{dX_t}{dt}=u_t^\theta(X_t),\qquad X_1=y$$

得到 $X_0=(\psi_1^\theta)^{-1}(y)$。这个 $X_0$ **不是随机抽取的噪声**，而是当前模型把 $y$ 反向映射得到的特定位置。

同时沿轨迹累计散度：

$$\log p_1^\theta(y)=\log p_0(X_0)-\int_0^1\nabla\cdot u_t^\theta(X_t)dt$$

虽然轨迹反向求解，这里的积分仍按 $0\to1$ 写，所以保留负号。

若希望两个量一起反向求解，可引入辅助标量 $a_t$，设置 $a_1=0$，并统一采用以下符号约定：

$$\frac{d}{dt}\begin{pmatrix}X_t\\a_t\end{pmatrix}
=\begin{pmatrix}u_t^\theta(X_t)\\-\nabla\cdot u_t^\theta(X_t)\end{pmatrix},
\qquad \begin{pmatrix}X_1\\a_1\end{pmatrix}=\begin{pmatrix}y\\0\end{pmatrix}$$

因为积分方向是 $1\to0$：

$$a_0=\int_1^0-\nabla\cdot u_t^\theta(X_t)dt
=\int_0^1\nabla\cdot u_t^\theta(X_t)dt$$

所以 $\log p_1^\theta(y)=\log p_0(X_0)-a_0$。对整个 batch 计算平均损失，再求参数梯度并更新：

$$\theta\leftarrow\theta-\eta\nabla_\theta\widehat{\mathcal L}(\theta)$$

1. **真实样本 y：**
  作为终点 X₁
2. **反向求解 ODE：**
  得到 X₀ 与累计散度 a₀
3. **计算 NLL：**
  −log p₀(X₀) + a₀
4. **求梯度，更新 θ：**
  改变下一轮的速度场

反向积分寻找对应起点；反向传播计算参数梯度。两者不是同一件事。

$X_0$、整条轨迹和散度都依赖 $\theta$，因此梯度必须考虑参数如何影响完整的动力学过程。可以对数值求解器反向传播，也可以使用伴随方法。

## 11 · 一个例子：只学习方差的一维 CNF

设一维速度场只有一个参数：

$$u_t^\theta(x)=\theta x$$

ODE 的解为 $X_t=e^{\theta t}X_0$。当 $X_0\sim\mathcal N(0,1)$ 时：

$$X_1\sim\mathcal N(0,e^{2\theta})$$

对于真实样本 $y$，有 $X_0=e^{-\theta}y$，散度 $\partial_xu_t^\theta=\theta$，于是：

$$\log p_1^\theta(y)
=-\frac12\log(2\pi)-\frac12e^{-2\theta}y^2-\theta$$

若真实分布为 $q=\mathcal N(0,\sigma_*^2)$，其中 $\sigma_*>0$，则总体负对数似然为：

$$\mathcal L(\theta)
=\frac12\log(2\pi)+\theta+\frac12\sigma_*^2e^{-2\theta}$$

求导并令导数为零：

$$\frac{d\mathcal L}{d\theta}=1-\sigma_*^2e^{-2\theta}=0$$

得到 $e^{2\theta}=\sigma_*^2$，即 $\theta^*=\log\sigma_*$，此时 $p_1^{\theta^*}=q$。

下面为可视化取 $\sigma_*=2$，即目标 $\mathcal N(0,4)$。拖动参数，或按“梯度更新一步”，可以看到终点密度与损失如何一起变化。图中直接计算解析解，没有在后台训练神经网络。

<!-- cnf-training-demo -->



训练没有给每个样本标注正确速度，也没有指定中间路径。它只要求终点密度拟合真实数据，梯度便通过密度变化关系调整速度参数。

这个模型只能学习方差，不能学习非零均值或多峰分布。因此，**训练目标是否合理，与模型是否具备足够表达能力，是两个不同的问题。**

## 12 · 为什么传统 CNF 训练昂贵

一次最大似然训练，通常需要完成三个相互关联的计算：

- 从真实数据反向求解 ODE，获得对应起点与轨迹。
- 沿途计算并积分散度。
- 对轨迹与密度计算求参数梯度。

ODE 求解器会在多个时间点反复调用速度网络，因此损失计算通常需要多次网络评估。

散度又是网络对输入的导数。

$$\nabla\cdot u_t^\theta(x)
=\operatorname{tr}\left(D_xu_t^\theta(x)\right)
=\sum_{k=1}^d\frac{\partial u_{t,k}^\theta(x)}{\partial x_k}$$

高维情况下，精确计算很贵。

自动微分可以计算所需的 Jacobian 向量乘积，而不显式构造完整矩阵。但最终训练梯度仍需考虑轨迹与这些导数计算对参数的依赖。

理论上密度公式是精确的，实际 ODE 数值求解和随机迹估计存在误差。这些误差通常又会增加计算成本。

## 13 · 概念梳理总结

Flow 与速度场，是同一运动的两种描述。速度场告诉你“此刻该怎么走”，Flow 告诉你“从起点出发，到时刻 $t$ 已经到了哪里”。给定初始分布 $X_0\sim p_0$，便得到：

$$X_t=\psi_t(X_0),\qquad p_t=(\psi_t)_\#p_0$$

前者描述单个样本的运动，后者描述整个分布的运输。在适当正则条件下，$\psi_t$ 可微且可逆，$X_t$ 构成确定性 Markov 过程。


| 概念             | 回答的问题               | 核心关系                                                 |
| -------------- | ------------------- | ---------------------------------------------------- |
| Flow           | 从起点出发，到时刻 $t$ 到了哪里？ | $X_t=\psi_t(X_0)$                                    |
| Velocity Field | 此刻在这里应该怎样运动？        | $\dot X_t=u_t(X_t)$                                  |
| Push-forward   | 所有样本这样运动后形成什么分布？    | $p_t=(\psi_t)_\#p_0$                                   |
| 连续性方程          | 运动与密度变化是否一致？        | $\partial_tp_t+\nabla\cdot(p_tu_t)=0$                |
| 瞬时变量替换         | 沿着轨迹，密度怎样改变？        | $\frac{d}{dt}\log p_t(X_t)=-\nabla\cdot u_t(X_t)$    |
| CNF            | 如何把这套变换变成可学习的模型？    | $\theta\to u_t^\theta\to\psi_t^\theta\to p_1^\theta$ |


如果指定概率路径也满足同一个连续性方程、初值和边界条件，并且解唯一，那么速度场实际生成的就是这条路径。

局部空间膨胀，沿轨迹的密度下降；局部空间压缩，沿轨迹的密度上升。对瞬时变量替换公式积分，就能从初始密度算出终点密度。

传统 CNF 通过最小化真实数据的负对数似然 $\mathcal L(\theta)=-\mathbb E_{Y\sim q}\log p_1^\theta(Y)$，让终点分布接近真实分布。训练时需要反向求解轨迹、累计散度，再对这些计算求参数梯度。

Flow 描述运动，速度场给出局部规则，概率守恒连接分布；CNF 把速度场变成可学习的网络，再通过训练让最终分布接近真实数据。

### 整理说明与延伸阅读

瞬时变量替换与 CNF 的原始讨论可参见 [Chen 等，Neural Ordinary Differential Equations](https://arxiv.org/abs/1806.07366)；连续流中的随机迹估计可参见 [Grathwohl 等，FFJORD](https://arxiv.org/abs/1810.01367)。
