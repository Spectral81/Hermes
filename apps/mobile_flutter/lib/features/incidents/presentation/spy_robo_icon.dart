import 'package:flutter/material.dart';

/// Icono animado de robo (espía) — flotación + balanceo como en spy-animated.html.
class SpyRoboIcon extends StatefulWidget {
  const SpyRoboIcon({
    super.key,
    this.size = 28,
    this.animate = true,
  });

  final double size;
  final bool animate;

  static const assetPath = 'assets/markers/spy.png';

  @override
  State<SpyRoboIcon> createState() => _SpyRoboIconState();
}

class _SpyRoboIconState extends State<SpyRoboIcon>
    with TickerProviderStateMixin {
  late final AnimationController _floatCtrl;
  late final AnimationController _swayCtrl;
  late final Animation<double> _float;
  late final Animation<double> _sway;

  @override
  void initState() {
    super.initState();
    _floatCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3800),
    );
    _swayCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 6500),
    );
    _float = Tween<double>(begin: 0, end: -4).animate(
      CurvedAnimation(parent: _floatCtrl, curve: Curves.easeInOut),
    );
    _sway = TweenSequence<double>([
      TweenSequenceItem(tween: ConstantTween(0), weight: 40),
      TweenSequenceItem(
        tween: Tween(begin: 0, end: -0.04),
        weight: 8,
      ),
      TweenSequenceItem(
        tween: Tween(begin: -0.04, end: 0.028),
        weight: 10,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 0.028, end: 0),
        weight: 10,
      ),
      TweenSequenceItem(tween: ConstantTween(0), weight: 32),
    ]).animate(_swayCtrl);

    if (widget.animate) {
      _floatCtrl.repeat(reverse: true);
      _swayCtrl.repeat();
    }
  }

  @override
  void didUpdateWidget(covariant SpyRoboIcon oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.animate && !oldWidget.animate) {
      _floatCtrl.repeat(reverse: true);
      _swayCtrl.repeat();
    } else if (!widget.animate && oldWidget.animate) {
      _floatCtrl.stop();
      _swayCtrl.stop();
      _floatCtrl.value = 0;
      _swayCtrl.value = 0;
    }
  }

  @override
  void dispose() {
    _floatCtrl.dispose();
    _swayCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final image = Image.asset(
      SpyRoboIcon.assetPath,
      width: widget.size,
      height: widget.size,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      errorBuilder: (_, __, ___) => Text(
        '🥷',
        style: TextStyle(fontSize: widget.size * 0.85),
      ),
    );

    if (!widget.animate) return image;

    return AnimatedBuilder(
      animation: Listenable.merge([_floatCtrl, _swayCtrl]),
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, _float.value),
          child: Transform.rotate(
            angle: _sway.value,
            alignment: const Alignment(0, 0.4),
            child: child,
          ),
        );
      },
      child: image,
    );
  }
}
