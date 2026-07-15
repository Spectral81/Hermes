import 'package:flutter/material.dart';

/// Icono PNG con flotación + balanceo (estilo animated.html).
class AnimatedAssetIcon extends StatefulWidget {
  const AnimatedAssetIcon({
    super.key,
    required this.assetPath,
    this.size = 28,
    this.animate = true,
    this.fallbackEmoji = '📍',
  });

  final String assetPath;
  final double size;
  final bool animate;
  final String fallbackEmoji;

  @override
  State<AnimatedAssetIcon> createState() => _AnimatedAssetIconState();
}

class _AnimatedAssetIconState extends State<AnimatedAssetIcon>
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
      TweenSequenceItem(tween: Tween(begin: 0.0, end: -0.04), weight: 8),
      TweenSequenceItem(tween: Tween(begin: -0.04, end: 0.028), weight: 10),
      TweenSequenceItem(tween: Tween(begin: 0.028, end: 0.0), weight: 10),
      TweenSequenceItem(tween: ConstantTween(0), weight: 32),
    ]).animate(_swayCtrl);

    if (widget.animate) {
      _floatCtrl.repeat(reverse: true);
      _swayCtrl.repeat();
    }
  }

  @override
  void didUpdateWidget(covariant AnimatedAssetIcon oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.animate && !oldWidget.animate) {
      _floatCtrl.repeat(reverse: true);
      _swayCtrl.repeat();
    } else if (!widget.animate && oldWidget.animate) {
      _floatCtrl
        ..stop()
        ..value = 0;
      _swayCtrl
        ..stop()
        ..value = 0;
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
      widget.assetPath,
      width: widget.size,
      height: widget.size,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.medium,
      errorBuilder: (_, __, ___) => Text(
        widget.fallbackEmoji,
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

class IncidentTypeIcon extends StatelessWidget {
  const IncidentTypeIcon({
    super.key,
    required this.type,
    this.size = 28,
    this.animate = true,
  });

  final String type; // robo|accidente|infraestructura|panico
  final double size;
  final bool animate;

  static String? assetFor(String type) {
    switch (type) {
      case 'robo':
        return 'assets/markers/spy.png';
      case 'accidente':
        return 'assets/markers/slip.png';
      case 'infraestructura':
        return 'assets/markers/hammer.png';
      case 'panico':
        return 'assets/markers/sos.png';
      default:
        return null;
    }
  }

  static String emojiFor(String type) {
    switch (type) {
      case 'robo':
        return '🥷';
      case 'accidente':
        return '🚑';
      case 'infraestructura':
        return '🔧';
      case 'panico':
        return '🚨';
      default:
        return '📍';
    }
  }

  @override
  Widget build(BuildContext context) {
    final asset = assetFor(type);
    if (asset == null) {
      return Text(emojiFor(type), style: TextStyle(fontSize: size * 0.85));
    }
    return AnimatedAssetIcon(
      assetPath: asset,
      size: size,
      animate: animate,
      fallbackEmoji: emojiFor(type),
    );
  }
}
